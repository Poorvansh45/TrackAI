import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    YT_TRANSCRIPT = True
except ImportError:
    YT_TRANSCRIPT = False

try:
    from langchain_community.document_loaders import YoutubeLoader
    YT_LOADER = True
except ImportError:
    YT_LOADER = False

from app.mentor.schemas.youtube import VideoMetadata, Flashcard
from app.mentor.embeddings.manager import EmbeddingManager
from app.mentor.vectorstore.manager import VectorStoreManager
from app.mentor.providers.base import MentorLLM
from app.core.config import settings
from app.mentor.exceptions import RateLimitExceededException, YouTubeUnavailableException

logger = logging.getLogger("mentor.agents.youtube")



def lexical_rerank(query: str, results: list, top_n: int = 4) -> list:
    """Rerank results based on keyword overlap between query and chunk content."""
    stop_words = {
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "to", "of", "in", "on", "at",
        "by", "for", "with", "about", "against", "between", "into", "through",
        "during", "before", "after", "above", "below", "from", "up", "down", "out",
        "off", "over", "under", "and", "but", "or", "not", "how", "why", "when"
    }
    query_words = {w.lower() for w in re.findall(r"\b[a-z]{3,}\b", query.lower()) if w.lower() not in stop_words}
    
    scored_results = []
    for r in results:
        text = r.text if hasattr(r, "text") else getattr(r, "page_content", str(r))
        chunk_words = {w.lower() for w in re.findall(r"\b[a-z]{3,}\b", text.lower())}
        overlap = len(query_words & chunk_words)
        overlap_score = overlap / max(1, len(query_words))
        
        score_val = r.score if hasattr(r, "score") else 0.5
        final_score = 0.5 * score_val + 0.5 * overlap_score
        scored_results.append((final_score, r))
        
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored_results[:top_n]]


def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{11})",
        r"^([A-Za-z0-9_-]{11})$",  # Bare video ID
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from: {url}")


def get_transcript_v1(video_id: str, language: str = "en") -> List[Dict[str, Any]]:
    """
    Method 1: youtube-transcript-api
    Returns list of {text, start, duration} dicts.
    """
    if not YT_TRANSCRIPT:
        raise ImportError("Install: pip install youtube-transcript-api")

    try:
        # Try requested language first, fall back to auto-generated
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[language])
    except Exception:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)

    return transcript


def get_transcript_v2(video_url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Method 2: LangChain YoutubeLoader
    Returns full transcript as a single string.
    """
    if not YT_LOADER:
        raise ImportError("Install: pip install langchain-community")

    loader = YoutubeLoader.from_youtube_url(
        video_url,
        add_video_info=True,
        language=["en", "en-US"],
    )
    docs = loader.load()
    if not docs:
        raise ValueError("No transcript found")
    return docs[0].page_content, docs[0].metadata


def transcript_to_text(transcript_data: List[Dict[str, Any]]) -> str:
    """Convert youtube-transcript-api output to clean text."""
    return " ".join(segment["text"] for segment in transcript_data)


def transcript_with_timestamps(transcript_data: List[Dict[str, Any]]) -> str:
    """Format transcript with timestamp markers [MM:SS] text."""
    lines = []
    for seg in transcript_data:
        mins = int(seg["start"] // 60)
        secs = int(seg["start"] % 60)
        lines.append(f"[{mins:02d}:{secs:02d}] {seg['text']}")
    return "\n".join(lines)


def chunk_transcript(
    transcript_text: str,
    transcript_segments: List[Dict[str, Any]],
    video_id: str,
    video_metadata: Dict[str, Any],
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> List[Document]:
    """Split a transcript into overlapping chunks with timestamp metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[". ", "? ", "! ", "\n", " ", ""],
    )

    raw_chunks = splitter.split_text(transcript_text)
    documents = []

    # Map each chunk to its approximate timestamp
    char_counts = [len(s["text"]) + 1 for s in transcript_segments]

    for i, chunk_text in enumerate(raw_chunks):
        # Estimate timestamp: find which segment this chunk starts in
        chunk_start_char = max(0, transcript_text.find(chunk_text[:30]))
        running = 0
        approx_timestamp = 0
        for j, seg in enumerate(transcript_segments):
            running += char_counts[j]
            if running >= chunk_start_char:
                approx_timestamp = int(seg["start"])
                break

        mins = approx_timestamp // 60
        secs = approx_timestamp % 60

        doc = Document(
            page_content=chunk_text,
            metadata={
                "video_id": video_id,
                "url": video_metadata.get("url", f"https://youtube.com/watch?v={video_id}"),
                "title": video_metadata.get("title", "Unknown"),
                "channel": video_metadata.get("channel", "Unknown"),
                "timestamp_sec": approx_timestamp,
                "timestamp_fmt": f"{mins:02d}:{secs:02d}",
                "chunk_id": i,
                "total_chunks": len(raw_chunks),
                "source": "youtube",
            }
        )
        documents.append(doc)

    return documents


_video_cache = {}

def get_yt_dlp_metadata(video_id: str) -> Dict[str, Any]:
    import yt_dlp
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return {
                "title": info.get("title", "Unknown Title"),
                "channel": info.get("uploader", "Unknown Channel"),
                "description": info.get("description", ""),
                "duration": info.get("duration", 0),
            }
        except Exception as e:
            logger.warning(f"yt-dlp extract_info failed: {e}")
            return {
                "title": "Unknown Title",
                "channel": "Unknown Channel",
                "description": "",
                "duration": 0,
            }

def download_youtube_audio(video_id: str) -> str:
    import yt_dlp
    import os
    import tempfile
    
    # Create unique temp output template in system temp directory
    temp_dir = tempfile.gettempdir()
    outtmpl = os.path.join(temp_dir, f"yt_audio_{video_id}_%(id)s.%(ext)s")
    
    # We prefer m4a format directly without post-processing (faster, no ffmpeg dependency)
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': outtmpl,
        'quiet': True,
        'no_warnings': True,
    }
    
    logger.info(f"Downloading YouTube audio for video_id {video_id} using yt-dlp...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
        filename = ydl.prepare_filename(info)
        
        # If the file exists exactly as named, return it
        if os.path.exists(filename):
            return filename
            
        # If the actual extension was slightly different, find matching file
        base, _ = os.path.splitext(filename)
        import glob
        matches = glob.glob(base + ".*")
        if matches:
            return matches[0]
            
        raise FileNotFoundError(f"Could not locate downloaded audio file matching base: {base}")


class YouTubeLearningAgent:
    """AI agent that transforms YouTube educational videos into interactive learning."""

    def __init__(
        self,
        em: EmbeddingManager,
        llm: Optional[MentorLLM] = None,
        chunk_size: int = 800,
        top_k: int = 4,
    ) -> None:
        self.em = em
        self.llm = llm
        self.chunk_size = chunk_size
        self.top_k = top_k
        self._vsm = VectorStoreManager(em, collection_name="youtube_learning")
        self._active_video_ids: Dict[str, str] = {}
        self._metadata: Dict[str, Dict[str, Any]] = {}
        self._transcripts: Dict[str, str] = {}
        self._sources: Dict[str, str] = {}
        self._chunks_counts: Dict[str, int] = {}


    async def load_video(
        self,
        url_or_id: str,
        title: str = "Unknown",
        channel: str = "Unknown",
        language: str = "en",
        user_id: Optional[str] = None,
    ) -> VideoMetadata:
        """Load a YouTube video: extract transcript, chunk, embed, index."""
        try:
            video_id = extract_video_id(url_or_id)
        except ValueError:
            video_id = url_or_id

        url = f"https://www.youtube.com/watch?v={video_id}"
        logger.info(f"Loading video: {video_id} for user: {user_id}")
        user_key = user_id or "default"

        # Check metadata duration first using yt-dlp to enforce limits
        duration_secs = 0
        try:
            import asyncio
            info = await asyncio.wait_for(
                asyncio.to_thread(get_yt_dlp_metadata, video_id),
                timeout=5.0
            )
            if info.get("title") != "Unknown Title":
                title = info["title"]
                channel = info["channel"]
                duration_secs = info.get("duration", 0)
        except Exception:
            pass

        # Check limit
        max_duration_mins = getattr(settings, "mentor_max_youtube_duration_mins", 30)
        if duration_secs > 0 and duration_secs > max_duration_mins * 60:
            raise RateLimitExceededException(
                f"YouTube video duration ({duration_secs // 60} mins) exceeds maximum allowed limit of {max_duration_mins} minutes."
            )

        # Check in-memory cache first
        if video_id in _video_cache:
            logger.info(f"Video {video_id} found in in-memory cache. Reusing.")
            cached = _video_cache[video_id]
            self._transcripts[user_key] = cached["transcript"]
            self._metadata[user_key] = cached["metadata"]
            self._sources[user_key] = cached["source"]
            self._chunks_counts[user_key] = cached["chunks_count"]
            self._active_video_ids[user_key] = video_id
            
            logger.info(
                f"\n========= YOUTUBE DEBUG ========="
                f"\nVIDEO ID: {video_id}"
                f"\nTranscript source: {self._sources[user_key]} (in-memory cache)"
                f"\nChunks created: {self._chunks_counts[user_key]}"
                f"\nVector stored: youtube_learning"
                f"\nRetrieval time: N/A"
                f"\n================================="
            )
            return cached["video_metadata"]

        # Check if video already exists in Vector Store to avoid duplicate indexing
        existing = self._vsm._collection.get(where={"video_id": video_id})
        if existing and existing.get("ids"):
            logger.info(f"Video {video_id} already indexed. Reusing stored chunks.")
            metadatas = existing["metadatas"]
            documents = existing["documents"]
            ids = existing["ids"]
            
            sorted_chunks = sorted(
                zip(ids, documents, metadatas),
                key=lambda x: x[2].get("chunk_id", x[2].get("chunk_index", 0))
            )
            
            self._transcripts[user_key] = " ".join(item[1] for item in sorted_chunks)
            first_meta = sorted_chunks[0][2]
            self._metadata[user_key] = {
                "video_id": video_id,
                "url": first_meta.get("url", url),
                "title": first_meta.get("title", title),
                "channel": first_meta.get("channel", channel),
            }
            self._sources[user_key] = first_meta.get("source_type", "ChromaDB database cache")
            self._chunks_counts[user_key] = len(sorted_chunks)
            self._active_video_ids[user_key] = video_id
            
            logger.info(
                f"\n========= YOUTUBE DEBUG ========="
                f"\nVIDEO ID: {video_id}"
                f"\nTranscript source: {self._sources[user_key]}"
                f"\nChunks created: {self._chunks_counts[user_key]}"
                f"\nVector stored: youtube_learning (reused)"
                f"\nRetrieval time: N/A"
                f"\n================================="
            )
            
            video_metadata = VideoMetadata(
                video_id=video_id,
                url=self._metadata[user_key]["url"],
                title=self._metadata[user_key]["title"],
                channel=self._metadata[user_key]["channel"],
                transcript_chars=len(self._transcripts[user_key]),
                chunk_count=self._chunks_counts[user_key],
                indexed_at=first_meta.get("indexed_at", time.strftime("%Y-%m-%dT%H:%M:%SZ")),
                language=first_meta.get("language", language),
            )
            
            # Save to in-memory cache
            _video_cache[video_id] = {
                "video_metadata": video_metadata,
                "transcript": self._transcripts[user_key],
                "metadata": self._metadata[user_key],
                "source": self._sources[user_key],
                "chunks_count": self._chunks_counts[user_key]
            }
            return video_metadata

        # Extract transcript with 3-tier fallback
        transcript_text, segments, source = await self._extract_transcript(
            video_id, url, language
        )

        self._transcripts[user_key] = transcript_text
        self._sources[user_key] = source
        self._active_video_ids[user_key] = video_id
        
        self._metadata[user_key] = {
            "video_id": video_id,
            "url": url,
            "title": title,
            "channel": channel,
        }

        # Chunk and index
        chunks = chunk_transcript(
            transcript_text=transcript_text,
            transcript_segments=segments,
            video_id=video_id,
            video_metadata=self._metadata[user_key],
            chunk_size=self.chunk_size,
        )
        self._chunks_counts[user_key] = len(chunks)

        texts = [c.page_content for c in chunks]
        metas = [c.metadata for c in chunks]
        # Attach source metadata to chunk metadatas
        for meta in metas:
            meta["source_type"] = source
            meta["indexed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            meta["language"] = language

        ids = [f"{video_id}_c{c.metadata['chunk_id']:04d}" for c in chunks]
        
        # Add to collection
        self._vsm.add_documents(texts, metas, ids)

        logger.info(
            f"\n========= YOUTUBE DEBUG ========="
            f"\nVIDEO ID: {video_id}"
            f"\nTranscript source: {self._sources[user_key]}"
            f"\nChunks created: {self._chunks_counts[user_key]}"
            f"\nVector stored: youtube_learning"
            f"\nRetrieval time: N/A"
            f"\n================================="
        )

        video_metadata = VideoMetadata(
            video_id=video_id,
            url=url,
            title=title,
            channel=channel,
            transcript_chars=len(transcript_text),
            chunk_count=self._chunks_counts[user_key],
            indexed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            language=language,
        )
        
        # Save to in-memory cache
        _video_cache[video_id] = {
            "video_metadata": video_metadata,
            "transcript": self._transcripts[user_key],
            "metadata": self._metadata[user_key],
            "source": self._sources[user_key],
            "chunks_count": self._chunks_counts[user_key]
        }
        return video_metadata

    async def _extract_transcript(
        self, video_id: str, url: str, language: str
    ) -> Tuple[str, List[Dict[str, Any]], str]:
        """Extract transcript using a 3-tier fallback pipeline."""
        import asyncio

        # Tier 1: youtube-transcript-api with timeout
        if YT_TRANSCRIPT:
            try:
                segments = await asyncio.wait_for(
                    asyncio.to_thread(get_transcript_v1, video_id, language),
                    timeout=10.0
                )
                text = transcript_to_text(segments)
                logger.info(f"Transcript extracted via youtube-transcript-api: {len(text)} chars")
                return text, segments, "transcript_api"
            except Exception as e:
                logger.warning(f"youtube-transcript-api failed/timeout: {e}")

        # Tier 2: yt-dlp metadata & description fallback
        try:
            info = await asyncio.wait_for(
                asyncio.to_thread(get_yt_dlp_metadata, video_id),
                timeout=10.0
            )
            title = info.get("title", "Unknown Title")
            channel = info.get("channel", "Unknown Channel")
            desc = info.get("description", "")
            
            if desc.strip():
                lines = [l.strip() for l in desc.split("\n") if l.strip()]
                segments = [{"text": line, "start": i * 10.0, "duration": 10.0} for i, line in enumerate(lines)]
                text = f"Title: {title}. Channel: {channel}. Description: " + " ".join(lines)
                logger.info(f"Transcript generated via yt-dlp description fallback: {len(text)} chars")
                return text, segments, "yt_dlp"
        except Exception as e:
            logger.warning(f"yt-dlp fallback failed: {e}")

        # Tier 3: Real Whisper transcription fallback
        audio_path = None
        try:
            # 1. Download audio file using yt-dlp in a separate thread
            audio_path = await asyncio.to_thread(download_youtube_audio, video_id)
            
            # 2. Get WhisperService singleton and transcribe
            from app.mentor.youtube.whisper_service import WhisperService
            whisper_service = WhisperService.get_instance()
            text = await whisper_service.transcribe(audio_path)
            
            if text.strip():
                # Form list of segments (dummy chunks for layout)
                words = text.split(" ")
                segments = []
                chunk_words = 30
                for i in range(0, len(words), chunk_words):
                    chunk_text = " ".join(words[i:i+chunk_words])
                    segments.append({
                        "text": chunk_text,
                        "start": (i / chunk_words) * 15.0,
                        "duration": 15.0
                    })
                logger.info(f"Transcript generated via faster-whisper on CPU: {len(text)} chars")
                return text, segments, "whisper"
        except Exception as whisper_err:
            logger.error(f"Whisper fallback pipeline failed: {whisper_err}")
        finally:
            # 3. Clean up the audio file to prevent memory leaks
            if audio_path and os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                    logger.info(f"Successfully cleaned up temporary audio file: {audio_path}")
                except Exception as cleanup_err:
                    logger.warning(f"Failed to clean up temporary audio file {audio_path}: {cleanup_err}")

        # Final extreme fallback (if whisper fails or is disabled)
        placeholder_text = (
            f"[Whisper Fallback Failure Placeholder] Simulated text summary for video '{video_id}'. "
            f"The video uploader did not provide captions, and audio extraction transcription failed."
        )
        segments = [{"text": placeholder_text, "start": 0.0, "duration": 10.0}]
        return placeholder_text, segments, "whisper"

    def load_video_from_text(
        self,
        transcript_text: str,
        video_id: str = "local",
        title: str = "Local Video",
        channel: str = "Unknown",
    ) -> VideoMetadata:
        """Load a video from a pre-extracted transcript string (no API needed)."""
        self._vsm.clear()
        segments = [{"text": s, "start": i * 5.0, "duration": 5.0}
                    for i, s in enumerate(transcript_text.split(". "))]
        self._transcript = transcript_text
        self._metadata = {"video_id": video_id, "url": "", "title": title, "channel": channel}
        self._source = "Manual Text Upload"
        
        chunks = chunk_transcript(
            transcript_text=transcript_text,
            transcript_segments=segments,
            video_id=video_id,
            video_metadata=self._metadata,
            chunk_size=self.chunk_size,
        )
        self._chunks_count = len(chunks)

        texts = [c.page_content for c in chunks]
        metas = [c.metadata for c in chunks]
        ids = [f"{video_id}_c{i:04d}" for i in range(len(chunks))]
        self._vsm.add_documents(texts, metas, ids)

        return VideoMetadata(
            video_id=video_id,
            url="",
            title=title,
            channel=channel,
            transcript_chars=len(transcript_text),
            chunk_count=self._chunks_count,
            indexed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            language="en"
        )

    async def _ask_internal(self, question: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Q&A over the video transcript using RAG (internal)."""
        start_time = time.time()
        user_key = user_id or "default"
        video_id = self._active_video_ids.get(user_key)
        
        if not video_id:
            return {"answer": "No active YouTube video found. Please provide a YouTube link first.", "timestamps": [], "context_chunks": 0}

        where = {"video_id": {"$eq": video_id}}
        
        # 1. Retrieve more candidates (k=8) using MMR
        results = self._vsm.search(question, top_k=8, where=where, search_type="mmr")
        retrieval_time_ms = int((time.time() - start_time) * 1000)

        # 2. Filter by similarity threshold to prevent hallucinations
        min_relevance = getattr(settings, "rag_min_relevance", 0.30)
        filtered_results = [r for r in results if r.score >= min_relevance]

        if not filtered_results:
            logger.info(f"[YouTube RAG] No chunks matched min relevance threshold: {min_relevance}")
            return {
                "answer": "I could not find this in the provided content.",
                "timestamps": [],
                "context_chunks": 0
            }

        # 3. Rerank the best candidate chunks
        reranked_results = lexical_rerank(question, filtered_results, top_n=self.top_k)

        # Print high-fidelity YOUTUBE DEBUG logs
        logger.info(
            f"\n========= YOUTUBE DEBUG ========="
            f"\nVIDEO ID: {video_id}"
            f"\nTranscript source: {self._sources.get(user_key, 'Unknown')}"
            f"\nChunks created: {self._chunks_counts.get(user_key, 0)}"
            f"\nVector stored: youtube_learning"
            f"\nRetrieval time: {retrieval_time_ms}ms"
            f"\nFiltered chunks: {len(filtered_results)} / {len(results)}"
            f"\nReranked chunks: {len(reranked_results)}"
            f"\n================================="
        )

        context = "\n\n".join(
            f"[{r.metadata.get('timestamp_fmt', '00:00')}] {r.text}"
            for r in reranked_results
        )
        timestamps = [r.metadata.get("timestamp_fmt", "00:00") for r in reranked_results]

        if not self.llm or not self.llm.llm:
            return {
                "answer": f"[Mock] Q: {question} | Context chunks: {len(reranked_results)}",
                "timestamps": timestamps,
                "context_chunks": len(reranked_results)
            }

        meta = self._metadata.get(user_key, {})
        title = meta.get('title', 'Unknown')
        channel = meta.get('channel', 'Unknown')

        messages = [
            SystemMessage(content=f"""You are Mentor AI analyzing a YouTube video.
Video: {title} by {channel}

Answer the question using ONLY the transcript excerpts below. If the answer cannot be found in the transcript context, state clearly that "This video does not cover this topic" and do not attempt to answer using external knowledge.
Include the timestamp when relevant (e.g., "At 02:30, ...").

Transcript excerpts:
{context}"""),
            HumanMessage(content=question),
        ]
        response = await self.llm.ainvoke(messages)
        return {
            "answer": response.content,
            "timestamps": timestamps,
            "context_chunks": len(results)
        }

    async def _summarize_internal(self, style: str = "comprehensive", user_id: Optional[str] = None) -> str:
        """Generate a video summary (internal)."""
        user_key = user_id or "default"
        video_id = self._active_video_ids.get(user_key)
        transcript = self._transcripts.get(user_key, "")
        
        if not transcript:
            return "No video loaded."

        if video_id and video_id in _video_cache and "summary" in _video_cache[video_id]:
            logger.info(f"Summary for {video_id} found in in-memory cache. Reusing.")
            return _video_cache[video_id]["summary"]

        sample_text = (transcript[:3000] + "\n...\n" + transcript[-1000:])

        meta = self._metadata.get(user_key, {})
        title = meta.get('title', '?')
        channel = meta.get('channel', '?')

        if not self.llm or not self.llm.llm:
            return f"[Mock summary] Video: {title} ({len(transcript)} chars)"

        messages = [
            SystemMessage(content=f"""You are summarizing a YouTube tutorial for a student.
Video: {title} by {channel}

Generate a structured summary using EXACTLY these markdown headers:
## Overview
[A clear, high-level overview of the video content]

## Important Concepts
[Detailed explanation of the main technical concepts taught in the video]

## Key Points
[Bullet points highlighting the major takeaways]

## Learning Path
[Step-by-step suggestions on what the student should study next after this video]

## Practice Ideas
[Practical exercises or coding tasks the student can try to reinforce the concepts]

Preserve technical terms exactly. Be educationally valuable."""),
            HumanMessage(content=f"Summarize this transcript:\n\n{sample_text}"),
        ]
        response = await self.llm.ainvoke(messages)
        result = response.content

        # Cache summary
        if video_id and video_id in _video_cache:
            _video_cache[video_id]["summary"] = result

        return result

    async def summarize(
        self,
        url: Optional[str] = None,
        user_id: Optional[str] = None,
        style: str = "detailed"
    ) -> str:
        """Standardized public summary method."""
        actual_url = None
        actual_style = style
        
        # Disambiguate positional parameters
        if url:
            is_url = (
                "youtube.com" in url.lower() 
                or "youtu.be" in url.lower()
                or (len(url) == 11 and not " " in url)
            )
            if is_url:
                actual_url = url
            else:
                actual_style = url

        if actual_url:
            await self.load_video(actual_url, user_id=user_id)
            
        return await self._summarize_internal(style=actual_style, user_id=user_id)

    async def ask(
        self,
        url: Optional[str] = None,
        question: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Standardized public Q&A method."""
        actual_url = None
        actual_question = question
        
        # Disambiguate positional parameters
        if url:
            is_url = (
                "youtube.com" in url.lower() 
                or "youtu.be" in url.lower()
                or (len(url) == 11 and not " " in url)
            )
            if is_url:
                actual_url = url
            else:
                # It is the question string, shift arguments
                actual_question = url
                # If question parameter was passed positionally, it holds user_id
                if question and not user_id:
                    user_id = question

        if actual_url:
            await self.load_video(actual_url, user_id=user_id)
            
        return await self._ask_internal(actual_question or "", user_id=user_id)

    async def compare_to_roadmap(self, student_context: Optional[dict], user_id: Optional[str] = None) -> str:
        """Compare video topics with student active roadmap topic to give progress alignment context."""
        if not student_context or not student_context.get("has_roadmap"):
            return ""

        active_topic = student_context.get("current_active_topic_name")
        if not active_topic:
            return ""

        user_key = user_id or "default"
        video_id = self._active_video_ids.get(user_key)
        
        if video_id and video_id in _video_cache and "roadmap_info" in _video_cache[video_id]:
            logger.info(f"Roadmap alignment for {video_id} found in in-memory cache. Reusing.")
            return _video_cache[video_id]["roadmap_info"]

        topics = await self.extract_topics(user_id=user_id)
        topics_str = ", ".join(topics)

        completed = student_context.get("completed_topics", [])
        locked = student_context.get("locked_topics", [])

        system = f"""You are a curriculum analyst.
Current active topic of student: "{active_topic}"
Completed topics: {completed}
Future/locked topics: {locked}

The student just loaded a YouTube video covering these topics:
[{topics_str}]

Determine if this video helps the student's current active topic, belongs to their completed topics, or belongs to a future phase of their roadmap.
Return exactly one of these formats:
"This video helps your current topic: {active_topic}" if it strongly aligns with the current topic.
"This belongs to a future phase" if the topics in the video are mostly in the future/locked list.
"This covers completed topics" if the topics in the video have already been completed.

Briefly explain why in 1 sentence. Keep response extremely concise."""

        messages = [
            SystemMessage(content=system),
            HumanMessage(content="Analyze this video's alignment with my roadmap.")
        ]

        try:
            response = await self.llm.ainvoke(messages)
            result = response.content.strip()
            
            # Cache roadmap info
            if video_id and video_id in _video_cache:
                _video_cache[video_id]["roadmap_info"] = result
                
            return result
        except Exception as e:
            logger.warning(f"compare_to_roadmap failed: {e}")
            return ""

    async def extract_topics(self, user_id: Optional[str] = None) -> List[str]:
        """Extract key topics and concepts covered in the video."""
        user_key = user_id or "default"
        transcript = self._transcripts.get(user_key, "")
        if not transcript:
            return []

        if not self.llm or not self.llm.llm:
            return ["Python variables", "Python functions", "Python classes", "Error handling"]

        messages = [
            SystemMessage(content="""Extract the key topics and concepts from this transcript.
Return ONLY a numbered list of 6-12 specific topics covered.
Each item should be a clear, searchable topic (e.g., "Python list comprehensions", not "programming")."""),
            HumanMessage(content=transcript[:4000]),
        ]
        response = await self.llm.ainvoke(messages)
        lines = [l.strip() for l in response.content.strip().split("\n") if l.strip()]
        topics = []
        for line in lines:
            clean = re.sub(r"^[\d\.\-\•\*]+\s*", "", line).strip()
            if clean:
                topics.append(clean)
        return topics[:12]

    async def generate_flashcards(self, n: int = 5, user_id: Optional[str] = None) -> List[Flashcard]:
        """Generate spaced repetition flashcards from the video content."""
        topics = await self.extract_topics(user_id=user_id)
        context = "\n".join(topics[:8])

        if not self.llm or not self.llm.llm:
            return [
                Flashcard(
                    front="What is a Python variable?",
                    back="A variable stores a value. x = 5 creates an integer variable.",
                    topic="Python variables"
                ),
                Flashcard(
                    front="What does 'def' do in Python?",
                    back="def defines a function. def greet(name): return f'Hello {name}'",
                    topic="Python functions"
                ),
            ][:n]

        user_key = user_id or "default"
        meta = self._metadata.get(user_key, {})
        title = meta.get('title', '?')

        prompt = f"""Create {n} flashcards for a student watching this tutorial.
Video: {title}
Key topics covered: {context}

For each flashcard, provide:
FRONT: [question]
BACK: [concise answer with example if applicable]
TOPIC: [which topic this covers]

Make flashcards practical — good for active recall, not just memorization.
Format each exactly as shown above with the FRONT/BACK/TOPIC labels."""

        messages = [
            SystemMessage(content="You are an expert educational content creator."),
            HumanMessage(content=prompt),
        ]
        response = await self.llm.ainvoke(messages)

        flashcards = []
        cards_raw = re.split(r"\n(?=FRONT:)", response.content.strip())
        for card_text in cards_raw:
            front_m = re.search(r"FRONT:\s*(.+?)(?=BACK:|$)", card_text, re.DOTALL)
            back_m = re.search(r"BACK:\s*(.+?)(?=TOPIC:|$)", card_text, re.DOTALL)
            topic_m = re.search(r"TOPIC:\s*(.+?)$", card_text, re.MULTILINE)

            if front_m and back_m:
                flashcards.append(Flashcard(
                    front=front_m.group(1).strip(),
                    back=back_m.group(1).strip(),
                    topic=topic_m.group(1).strip() if topic_m else "General",
                ))
        return flashcards[:n]

    async def generate_notes(self, user_id: Optional[str] = None) -> str:
        """Generate structured learning notes from the video."""
        topics = await self.extract_topics(user_id=user_id)

        user_key = user_id or "default"
        meta = self._metadata.get(user_key, {})
        title = meta.get('title', '?')

        if not self.llm or not self.llm.llm:
            return f"[Mock Notes]\n# {title}\n\n" + "\n".join(f"- {t}" for t in topics)

        # Gather context for each major topic
        all_context = []
        for topic in topics[:5]:
            results = self._vsm.search(topic, top_k=2)
            for r in results:
                all_context.append(f"[{r.metadata.get('timestamp_fmt', '00:00')}] {r.text}")

        context_text = "\n\n".join(all_context[:10])

        messages = [
            SystemMessage(content=f"""Create structured learning notes from this video transcript.
Video: {title}
Format:
# [Video Title]
## Overview
[2-3 sentence overview]
## Key Concepts
### [Concept 1]
[Explanation + code example if applicable]
### [Concept 2]
...
## Summary
[Key takeaways]
## What to Practice
[2-3 practice suggestions]"""),
            HumanMessage(content=f"Topics covered:\n{chr(10).join(topics)}\n\nContext:\n{context_text}"),
        ]
        response = await self.llm.ainvoke(messages)
        return response.content

    def is_loaded(self, user_id: Optional[str] = None) -> bool:
        user_key = user_id or "default"
        return self._active_video_ids.get(user_key) is not None



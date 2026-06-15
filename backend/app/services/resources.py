"""
Resources Service — Tracks AI
==============================
Fetches REAL, verified YouTube videos and reading articles for any topic.
All resource URLs are dynamically fetched using Tavily and YouTube Data API v3.
"""

import logging
import json
import re
import urllib.parse
import asyncio
from typing import Optional, List, Dict, Tuple

logger = logging.getLogger("uvicorn.error")

try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False
    logger.warning("[Resources] httpx not installed — URL validation disabled")


def parse_youtube_duration(duration_str: str) -> str:
    """Parse ISO 8601 duration string (e.g. PT15M30S) to human-readable format."""
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(duration_str)
    if not match:
        return "10:00"
    hours, minutes, seconds = match.groups()
    hours = int(hours) if hours else 0
    minutes = int(minutes) if minutes else 0
    seconds = int(seconds) if seconds else 0
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes}:{seconds:02d}"


async def _validate_youtube_video_via_api(video_id: str, key: str) -> Optional[dict]:
    """Validate a YouTube video exists, is public, and is embeddable using YouTube Data API."""
    if not _HTTPX_AVAILABLE:
        return None
    url = f"https://www.googleapis.com/youtube/v3/videos"
    params = {
        "part": "snippet,status,contentDetails",
        "id": video_id,
        "key": key
    }
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                logger.info("[YOUTUBE VALIDATION] videoId=%s status=invalid", video_id)
                return None
            data = resp.json()
            items = data.get("items", [])
            if not items:
                logger.info("[YOUTUBE VALIDATION] videoId=%s status=invalid", video_id)
                return None
                
            v = items[0]
            status = v.get("status", {})
            privacy = status.get("privacyStatus", "")
            embeddable = status.get("embeddable", False)
            
            is_valid = privacy == "public" and embeddable is True
            logger.info("[YOUTUBE VALIDATION] videoId=%s status=%s", video_id, "valid" if is_valid else "invalid")
            
            if is_valid:
                snippet = v.get("snippet", {})
                content_details = v.get("contentDetails", {})
                
                title = snippet.get("title", "")
                channel = snippet.get("channelTitle", "")
                thumbnail = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
                duration = parse_youtube_duration(content_details.get("duration", "PT10M"))
                video_url = f"https://www.youtube.com/watch?v={video_id}"
                
                return {
                    "title": title,
                    "creator": channel,
                    "duration": duration,
                    "thumbnail": thumbnail,
                    "url": video_url,
                    "videoId": video_id
                }
    except Exception as e:
        logger.warning("[YOUTUBE VALIDATION] videoId=%s validation_error=%s", video_id, e)
        
    return None


async def _fetch_youtube_via_api(query: str, key: str, topic_name: str) -> Optional[dict]:
    """Fetch videos from YouTube Data API v3 and return the first valid one."""
    if not _HTTPX_AVAILABLE:
        return None
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "id",
        "maxResults": 5,
        "q": query,
        "type": "video",
        "key": key
    }
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                logger.warning("[YOUTUBE SEARCH] API returned status %d: %s", resp.status_code, resp.text)
                return None
            data = resp.json()
            items = data.get("items", [])
            logger.info("[YOUTUBE SEARCH] topic='%s' query='%s' results count=%d", topic_name, query, len(items))
            
            for item in items:
                video_id = item.get("id", {}).get("videoId")
                if not video_id:
                    continue
                video_data = await _validate_youtube_video_via_api(video_id, key)
                if video_data:
                    return video_data
    except Exception as e:
        logger.warning("[YOUTUBE SEARCH] Search request failed: %s", e)
    return None


async def fetch_youtube_videos(topic_name: str, skill: str) -> list[dict]:
    """Fetch core, deep_dive, and one_shot videos dynamically using YouTube API."""
    from app.core.config import settings
    key = settings.YOUTUBE_API_KEY or settings.GOOGLE_API_KEY
    results = []
    
    if not key or key.startswith("AQ."):
        logger.warning("[YOUTUBE SEARCH] YouTube Data API key is not configured.")
        return results
        
    queries = {
        "core": f"{topic_name} {skill} tutorial",
        "deep_dive": f"{topic_name} full course {skill}",
        "one_shot": f"{topic_name} revision {skill}"
    }
    
    for vtype, query in queries.items():
        video = await _fetch_youtube_via_api(query, key, topic_name)
        if video:
            video["type"] = vtype
            results.append(video)
            
    return results


async def _fetch_reading_via_tavily(query: str, key: str) -> list[str]:
    """Query Tavily Search API to retrieve reading resource URLs."""
    import httpx
    payload = {
        "api_key": key,
        "query": query,
        "search_depth": "basic",
        "max_results": 15
    }
    headers = {"Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post("https://api.tavily.com/search", json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return [res["url"] for res in data.get("results", []) if "url" in res]
            else:
                logger.warning("[READING TAVILY] Tavily returned status %d", resp.status_code)
    except Exception as e:
        logger.warning("[READING TAVILY] Failed: %s", e)
    return []


def _is_generic_homepage(url: str) -> bool:
    """Check if the given URL is a generic homepage or landing page."""
    try:
        parsed = urllib.parse.urlparse(url)
        path = parsed.path.strip("/")
        if not path or path.lower() in ("index", "index.html", "index.php", "index.asp", "dsa"):
            return True
        return False
    except Exception:
        return True


def _make_label_from_url(url: str, fallback_suffix: str) -> str:
    """Construct a clean title label from the URL slug."""
    try:
        parsed = urllib.parse.urlparse(url)
        path = parsed.path.strip("/")
        segments = [s for s in path.split("/") if s]
        if not segments:
            return f"Topic {fallback_suffix}"
            
        segment = segments[-1]
        if "." in segment:
            segment = segment.split(".")[0]
            
        clean = segment.replace("-", " ").replace("_", " ")
        words = clean.split()
        if not words:
            return f"Topic {fallback_suffix}"
            
        words = [w for w in words if not w.isdigit()]
        if not words:
            return f"Topic {fallback_suffix}"
            
        title = " ".join(w.capitalize() for w in words)
        if title.lower() in ("tutorial", "article", "guide", "reference", "index", "intro", "introduction"):
            return f"Topic {fallback_suffix}"
        return title
    except Exception:
        return f"Topic {fallback_suffix}"


def _derive_reading_metadata(url: str, topic_name: str) -> tuple[Optional[str], str, str]:
    """Derive source name, label title, and icon from URL."""
    url_lower = url.lower()
    
    if "w3schools.com" in url_lower:
        source = "W3Schools"
        icon = "W"
        label = _make_label_from_url(url, "Tutorial")
    elif "geeksforgeeks.org" in url_lower:
        source = "GeeksForGeeks"
        icon = "G"
        label = _make_label_from_url(url, "Article")
    elif "realpython.com" in url_lower:
        source = "Real Python"
        icon = "R"
        label = _make_label_from_url(url, "Tutorial")
    elif "developer.mozilla.org" in url_lower:
        source = "MDN Web Docs"
        icon = "P"
        label = _make_label_from_url(url, "Reference")
    elif "learn.microsoft.com" in url_lower or "docs.microsoft.com" in url_lower:
        source = "Microsoft Learn"
        icon = "P"
        label = _make_label_from_url(url, "Guide")
    elif "aws.amazon.com/docs" in url_lower or "docs.aws.amazon.com" in url_lower:
        source = "AWS Docs"
        icon = "P"
        label = _make_label_from_url(url, "Documentation")
    elif "docs.python.org" in url_lower or "python.org/doc" in url_lower:
        source = "Python Docs"
        icon = "P"
        label = _make_label_from_url(url, "Documentation")
    elif any(domain in url_lower for domain in ["oracle.com", "react.dev", "swift.org", "kotlinlang.org", "nodejs.org", "typescriptlang.org", "git-scm.com", "man7.org", "linuxcommand.org", "rust-lang.org"]):
        source = "Official Docs"
        icon = "P"
        label = _make_label_from_url(url, "Documentation")
    else:
        return None, "", ""
        
    if len(label) < 4:
        label = f"{topic_name.capitalize()} {label}"
        
    return source, label, icon


async def _validate_single_reading(r: dict, topic_name: str) -> Optional[dict]:
    """Validate a reading URL by making a HEAD or GET request."""
    if not _HTTPX_AVAILABLE:
        return r
    url = r.get("url", "")
    title = r.get("label", "")
    status_code = 404
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True, max_redirects=4) as client:
            try:
                resp = await client.head(url)
                status_code = resp.status_code
                if status_code in (403, 405, 999):
                    resp = await client.get(url)
                    status_code = resp.status_code
            except httpx.RequestError:
                resp = await client.get(url)
                status_code = resp.status_code
    except Exception:
        status_code = 500
        
    is_valid = 200 <= status_code < 300
    if is_valid:
        return r
    return None


def get_reading_priority(url: str, source: str) -> int:
    """Returns priority score (lower is higher priority, 1 to 8)."""
    url_lower = url.lower()
    source_lower = source.lower()
    
    # 8. Python Docs
    if "docs.python.org" in url_lower or "python.org/doc" in url_lower or "python docs" in source_lower:
        return 8
    # 7. AWS Docs
    if "aws.amazon.com/docs" in url_lower or "docs.aws.amazon.com" in url_lower or "aws docs" in source_lower:
        return 7
    # 6. Microsoft Learn
    if "learn.microsoft.com" in url_lower or "docs.microsoft.com" in url_lower or "microsoft learn" in source_lower:
        return 6
    # 5. MDN Web Docs
    if "developer.mozilla.org" in url_lower or "mdn" in source_lower:
        return 5
    # 4. Real Python
    if "realpython.com" in url_lower or "real python" in source_lower:
        return 4
    # 3. GeeksForGeeks
    if "geeksforgeeks.org" in url_lower or "geeksforgeeks" in source_lower:
        return 3
    # 2. W3Schools
    if "w3schools.com" in url_lower or "w3schools" in source_lower:
        return 2
        
    # 1. Official Documentation
    official_domains = [
        "docs.oracle.com", "react.dev", "reactjs.org", "kubernetes.io", "git-scm.com",
        "man7.org", "linuxcommand.org", "kotlinlang.org", "docs.swift.org", "nodejs.org",
        "typescriptlang.org", "vuejs.org", "angular.io", "rust-lang.org"
    ]
    if "official docs" in source_lower or "official documentation" in source_lower or any(d in url_lower for d in official_domains):
        return 1
        
    return 9


async def fetch_reading_resources(topic_name: str, skill: str) -> list[dict]:
    """Fetch reading resources dynamically from Tavily and prioritize them."""
    from app.core.config import settings
    tavily_key = settings.TAVILY_API_KEY
    raw_urls = []
    
    query = f"{topic_name} {skill} documentation w3schools geeksforgeeks realpython mdn microsoft learn aws docs python docs"
    
    if not tavily_key:
        logger.warning("[RESOURCE FETCH] Tavily API key is not configured.")
        return []
        
    logger.info("[TAVILY SEARCH] Attempting Tavily Search for reading links...")
    try:
        raw_urls = await _fetch_reading_via_tavily(query, tavily_key)
        logger.info("[TAVILY SEARCH] topic='%s' urls found=%d", topic_name, len(raw_urls))
    except Exception as e:
        logger.warning("[TAVILY SEARCH] Tavily Search failed: %s", e)
        return []
        
    resources = []
    seen_urls = set()
    validation_tasks = []
    
    for url in raw_urls:
        if url in seen_urls:
            continue
        seen_urls.add(url)
        
        if _is_generic_homepage(url):
            continue
            
        source, label, icon = _derive_reading_metadata(url, topic_name)
        if not source:
            continue
            
        validation_tasks.append(_validate_single_reading({"url": url, "label": label, "source": source, "icon": icon}, topic_name))
        
    validated_results = await asyncio.gather(*validation_tasks, return_exceptions=False)
    
    for r in validated_results:
        if r:
            resources.append(r)
            
    # Sort resources strictly by priority ranking
    resources.sort(key=lambda item: get_reading_priority(item["url"], item["source"]))
    
    return resources[:4]


# ---------------------------------------------------------------------------
# MongoDB cache helpers
# ---------------------------------------------------------------------------

async def _get_cached_resources(topic_id: str) -> Optional[dict]:
    """Return cached resources from MongoDB if less than 7 days old."""
    try:
        from app.core.database import get_database
        from datetime import datetime, timedelta

        db = get_database()
        if db is None:
            return None

        coll = db["topic_resources"]
        doc = await coll.find_one({"topicId": topic_id})
        if not doc:
            logger.info("[RESOURCE CACHE] miss for topic_id=%s", topic_id)
            return None

        last_updated = doc.get("lastUpdated")
        if last_updated:
            age = datetime.utcnow() - last_updated
            if age > timedelta(days=7):
                logger.info("[RESOURCE CACHE] miss (expired) for topic_id=%s", topic_id)
                return None

        logger.info("[RESOURCE CACHE] hit for topic_id=%s", topic_id)
        return {
            "videos": doc.get("videos", []),
            "reading": doc.get("articles", [])
        }

    except Exception as exc:
        logger.warning("[RESOURCE CACHE] read failed: %s", exc)
        return None


async def _cache_resources(topic_id: str, topic_name: str, resources: dict) -> None:
    """Persist resources to MongoDB using the requested topic_resources schema."""
    try:
        from app.core.database import get_database
        from datetime import datetime

        db = get_database()
        if db is None:
            return

        coll = db["topic_resources"]
        await coll.update_one(
            {"topicId": topic_id},
            {
                "$set": {
                    "topicId": topic_id,
                    "topicName": topic_name,
                    "videos": resources.get("videos", []),
                    "articles": resources.get("reading", []),
                    "lastUpdated": datetime.utcnow(),
                }
            },
            upsert=True,
        )
        logger.info("[RESOURCE CACHE] cached updated for topic_id=%s", topic_id)

    except Exception as exc:
        logger.warning("[RESOURCE CACHE] write failed: %s", exc)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_topic_resources(topic_id: str, topic_name: str, skill: str = "Python") -> dict:
    """Main entry point. Returns verified resources for a topic."""
    topic_id = topic_id.lower().strip()

    # Check MongoDB cache
    cached = await _get_cached_resources(topic_id)
    if cached:
        return cached

    # Fetch dynamically
    logger.info("[Resources] Fetching dynamically for topic: %s", topic_name)
    videos = await fetch_youtube_videos(topic_name, skill)
    reading = await fetch_reading_resources(topic_name, skill)
    
    resources = {
        "videos": videos,
        "reading": reading
    }
    
    # Save to MongoDB
    await _cache_resources(topic_id, topic_name, resources)

    return resources

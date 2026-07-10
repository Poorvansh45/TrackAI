import logging
import os
import asyncio
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("mentor.youtube.whisper")


class WhisperService:
    """
    Singleton service managing the faster-whisper transcription engine.
    Loads models lazily on demand and performs transcription inside execution threads.
    """
    _instance: Optional["WhisperService"] = None

    @classmethod
    def get_instance(cls) -> "WhisperService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self) -> None:
        self._model = None

    def get_model(self):
        """Lazy load the Whisper model on CPU."""
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
            except ImportError as e:
                logger.error("faster-whisper package not installed in active environment.")
                raise ImportError("faster-whisper is not installed. Run pip install faster-whisper.") from e

            model_size = settings.whisper_model_size
            logger.info(f"Lazy loading Whisper model '{model_size}' on CPU with int8 precision...")
            
            # CPU friendly model configuration using integer 8-bit quantization
            self._model = WhisperModel(
                model_size,
                device="cpu",
                compute_type="int8"
            )
            logger.info(f"Whisper model '{model_size}' loaded successfully.")
            
        return self._model

    async def transcribe(self, audio_path: str) -> str:
        """
        Transcribe an audio file using faster-whisper on CPU.
        Runs the CPU-heavy transcription inside a thread pool to remain async safe.
        """
        if not settings.whisper_enabled:
            logger.warning("Whisper transcription requested but WHISPER_ENABLED=false in settings.")
            return "[Whisper Disabled] Transcription could not be completed."

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Ensure the model is loaded
        model = self.get_model()

        def _run_transcription():
            logger.info(f"Starting faster-whisper transcription for: {audio_path}")
            segments, info = model.transcribe(audio_path, beam_size=5)
            
            text_segments = []
            for segment in segments:
                text_segments.append(segment.text)
                
            full_text = " ".join(text_segments).strip()
            logger.info(f"faster-whisper transcription completed: {len(full_text)} chars generated.")
            return full_text

        # Run CPU heavy work in a thread pool executor
        return await asyncio.to_thread(_run_transcription)

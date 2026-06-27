import json
import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Resolve absolute path to backend/.env and load environment variables
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(base_dir, ".env")
load_dotenv(env_path)



class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillSync API"
    API_V1_STR: str = "/api/v1"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "skillsync"
    JWT_SECRET_KEY: str = "supersecretkeychangeinproduction"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520  # 8 days

    # Tracks AI — LLM keys
    # Primary  : Gemini Flash Lite  (very cheap, high free quota)
    # Fallback : Groq Llama 3       (completely free tier)
    GOOGLE_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    YOUTUBE_API_KEY: str = ""
    TAVILY_API_KEY: str = ""

    BACKEND_CORS_ORIGINS: Union[List[str], str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                try:
                    return json.loads(v)
                except Exception:
                    return []
            return v
        return []

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

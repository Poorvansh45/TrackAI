import json
import os
from typing import List, Union, Optional
from pydantic import field_validator, AliasChoices, Field
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

    # ── Mentor AI chatbot settings ──
    app_name: str = "Tracks AI Mentor Engine"
    app_version: str = "1.0.0"
    
    openai_api_key: str = Field(default="", validation_alias=AliasChoices("openai_api_key", "OPENAI_API_KEY"))
    openai_model: str = Field(default="gpt-4o-mini", validation_alias=AliasChoices("openai_model", "openai_model_name", "OPENAI_MODEL_NAME"))
    openai_temperature: float = 0.2
    openai_max_tokens: int = 2048
    
    azure_openai_api_key: str = Field(default="", validation_alias=AliasChoices("azure_openai_api_key", "AZURE_OPENAI_API_KEY"))
    azure_openai_endpoint: str = Field(default="", validation_alias=AliasChoices("azure_openai_endpoint", "AZURE_OPENAI_ENDPOINT"))
    azure_openai_api_version: str = Field(default="2024-02-01", validation_alias=AliasChoices("azure_openai_api_version", "AZURE_OPENAI_API_VERSION"))
    azure_openai_deployment: str = Field(default="", validation_alias=AliasChoices("azure_openai_deployment", "azure_openai_chat_deployment_name", "AZURE_OPENAI_CHAT_DEPLOYMENT_NAME"))
    azure_openai_embedding_dep: str = Field(default="", validation_alias=AliasChoices("azure_openai_embedding_dep", "azure_openai_embedding_deployment_name", "AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME"))
    llm_provider: str = Field(default="openai", validation_alias=AliasChoices("llm_provider", "LLM_PROVIDER"))
    
    embedding_provider: str = Field(default="openai", validation_alias=AliasChoices("embedding_provider", "embeddings_provider", "EMBEDDINGS_PROVIDER"))
    embedding_model: str = Field(default="text-embedding-3-small", validation_alias=AliasChoices("embedding_model", "embeddings_model_name", "EMBEDDINGS_MODEL_NAME"))
    embedding_dimensions: Optional[int] = Field(default=None, validation_alias=AliasChoices("embedding_dimensions", "embeddings_dimensions", "EMBEDDINGS_DIMENSIONS"))
    
    chroma_mode: str = "persistent"
    chroma_persist_dir: str = Field(default="./data/chroma_db", validation_alias=AliasChoices("chroma_persist_dir", "chromadb_persist_directory", "CHROMADB_PERSIST_DIRECTORY"))
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_collection_name: str = "mentor_knowledge"
    
    memory_window_size: int = 10
    memory_max_tokens: int = 4000
    memory_strategy: str = "window"
    
    rag_top_k: int = 4
    rag_min_relevance: float = 0.30
    
    langchain_tracing_v2: bool = Field(default=False, validation_alias=AliasChoices("langchain_tracing_v2", "langsmith_tracing", "LANGSMITH_TRACING"))
    langchain_api_key: str = Field(default="", validation_alias=AliasChoices("langchain_api_key", "langsmith_api_key", "LANGSMITH_API_KEY"))
    langchain_project: str = Field(default="tracks-ai-mentor", validation_alias=AliasChoices("langchain_project", "langsmith_project", "LANGSMITH_PROJECT"))

    # Whisper Settings
    whisper_enabled: bool = Field(default=True, validation_alias=AliasChoices("whisper_enabled", "WHISPER_ENABLED"))
    whisper_model_size: str = Field(default="base", validation_alias=AliasChoices("whisper_model_size", "WHISPER_MODEL_SIZE"))

    # Mentor Hardening & Rate Limits
    mentor_debug: bool = Field(default=False, validation_alias=AliasChoices("mentor_debug", "MENTOR_DEBUG"))
    mentor_daily_chat_limit: int = Field(default=100, validation_alias=AliasChoices("mentor_daily_chat_limit", "MENTOR_DAILY_CHAT_LIMIT"))
    mentor_max_pdf_size_mb: int = Field(default=10, validation_alias=AliasChoices("mentor_max_pdf_size_mb", "MENTOR_MAX_PDF_SIZE_MB"))
    mentor_max_youtube_duration_mins: int = Field(default=30, validation_alias=AliasChoices("mentor_max_youtube_duration_mins", "MENTOR_MAX_YOUTUBE_DURATION_MINS"))



    # Helpers for Azure/OpenAI checking
    @property
    def is_azure_configured(self) -> bool:
        return bool(self.azure_openai_api_key and self.azure_openai_endpoint)

    @property
    def is_openai_configured(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def langsmith_enabled(self) -> bool:
        return self.langchain_tracing_v2 and bool(self.langchain_api_key)

    @property
    def mongodb_uri(self) -> str:
        return self.MONGODB_URL

    @property
    def mongodb_db_name(self) -> str:
        return self.DATABASE_NAME

    mongodb_collection_sessions: str = "mentor_sessions"
    mongodb_collection_quiz: str = "quiz_attempts"
    session_ttl_days: int = 30

    @property
    def jwt_secret_key(self) -> str:
        return self.JWT_SECRET_KEY

    @property
    def jwt_algorithm(self) -> str:
        return self.JWT_ALGORITHM

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


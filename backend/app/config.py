"""Centralised settings — read from environment via pydantic-settings."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://scilens:scilens@localhost:5432/scilens"

    # --- Auth ---
    JWT_SECRET: str = "dev-secret-change-me-in-production-please-32chars"
    JWT_EXPIRES_HOURS: int = 24
    COOKIE_NAME: str = "scilens_session"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000"

    # --- LLM (P2) ---
    VLLM_BASE_URL: str = ""
    VLLM_MODEL_NAME: str = ""
    VLLM_API_KEY: str = ""
    LLM_DEFAULT_TEMPERATURE: float = 0.7
    LLM_DEFAULT_MAX_TOKENS: int = 1024

    # --- RAGFlow (P2) ---
    RAGFLOW_ENDPOINT: str = ""
    RAGFLOW_AGENT_ID: str = ""
    RAGFLOW_API_KEY: str = ""
    # Mock mode: when true, ragflow_service returns deterministic fake responses
    # so the demo can run without a working RAGFlow backend.
    # Set to false (and fill the 3 vars above) to use real RAGFlow.
    RAGFLOW_MOCK: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

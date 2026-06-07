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

    # --- LLM provider selection (OpenAI 主、vLLM 備援) ---
    LLM_PRIMARY: str = "openai"          # "openai" | "vllm"
    LLM_FALLBACK_ENABLED: bool = True    # 主供應商失敗時自動改用另一個
    LLM_DEFAULT_TEMPERATURE: float = 0.7
    LLM_DEFAULT_MAX_TOKENS: int = 1024

    # --- vLLM (備援，OpenAI 相容) ---
    VLLM_BASE_URL: str = ""
    VLLM_MODEL_NAME: str = ""
    VLLM_API_KEY: str = ""

    # --- OpenAI (主) ---
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL_NAME: str = "gpt-5-mini"
    # ⚠️ 勿把 token 明文寫在這／.env／compose；改用 OPENAI_API_KEY_FILE 指向 docker secret。
    OPENAI_API_KEY: str = ""
    OPENAI_API_KEY_FILE: str = ""        # 機密檔路徑，如 /run/secrets/openai_api_key
    # gpt-5* 為推理模型：用 max_completion_tokens、不可送 temperature。
    OPENAI_PARAM_STYLE: str = "reasoning"     # "reasoning"(gpt-5*) | "legacy"(gpt-4o 等)
    OPENAI_REASONING_EFFORT: str = "minimal"  # minimal|low|medium|high；空字串=不送
    OPENAI_MIN_COMPLETION_TOKENS: int = 1024  # 推理會吃 token，設下限避免回空字串

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

    @property
    def openai_api_key(self) -> str:
        """優先讀機密檔（docker secret），避免 token 明文進 env / compose / repo。

        OPENAI_API_KEY_FILE 設定且可讀時讀檔；否則退回 OPENAI_API_KEY 環境變數。
        """
        if self.OPENAI_API_KEY_FILE:
            try:
                with open(self.OPENAI_API_KEY_FILE, encoding="utf-8") as fh:
                    return fh.read().strip()
            except OSError:
                return self.OPENAI_API_KEY
        return self.OPENAI_API_KEY


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

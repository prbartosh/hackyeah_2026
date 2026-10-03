from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Lokalnie: <repo>/assets, w Dockerze: /assets (montowane w docker-compose).
DEFAULT_INNOVATIONS_PATH = (
    Path(__file__).resolve().parents[3] / "assets" / "innowacje-spoleczne" / "innowacje.json"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "hackyeah-api"
    debug: bool = False
    database_url: str
    cors_origins: list[str] = []

    openai_api_key: str | None = None
    llm_model: str = "gpt-5.6-sol"
    # Tylko dla modeli rozumujących (np. gpt-5.x); pusty = parametr nie jest wysyłany.
    llm_reasoning_effort: str | None = "low"
    innovations_path: Path = DEFAULT_INNOVATIONS_PATH

    # Panel administratora (ADR 0006). Pusty token = panel wyłączony.
    admin_token: str | None = None
    embedding_model: str = "text-embedding-3-small"
    sla_hours: int = 48
    ai_daily_call_limit: int = 200
    ai_timeout_seconds: float = 45.0
    max_upload_mb: int = 10
    email_backend: str = "log"
    email_from: str = "panel@splot.local"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

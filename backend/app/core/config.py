from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_INNOVATIONS_PATH = (
    Path(__file__).resolve().parents[3] / "assets" / "innowacje-spoleczne" / "innowacje.json"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "hackyeah-api"
    debug: bool = False
    database_url: str
    cors_origins: list[str] = []

    llm_api_key: str | None = None
    # DeepSeek przez SDK openai (Responses API).
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-flash"
    llm_reasoning_effort: str | None = "low"
    # Obejmuje też tokeny rozumowania - za mało = ucięta odpowiedź (finish=length).
    llm_max_completion_tokens: int = 8000
    llm_daily_token_limit: int | None = None
    # false = czat odpowiada 503 bez wołania modelu.
    chat_enabled: bool = True
    innovations_path: Path = DEFAULT_INNOVATIONS_PATH

    # Panel administratora (ADR 0006). Pusty token = panel wyłączony.
    admin_token: str | None = None
    sla_hours: int = 48
    ai_daily_call_limit: int = 200
    ai_timeout_seconds: float = 45.0
    # Kreator pomysłów jest publiczny: własny dzienny limit wywołań AI, osobny od panelu.
    kreator_ai_daily_call_limit: int = 100
    max_upload_mb: int = 10
    email_backend: str = "log"
    email_from: str = "panel@splot.local"
    admin_notify_email: str | None = None
    public_base_url: str = "http://localhost:8080"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

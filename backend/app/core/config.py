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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

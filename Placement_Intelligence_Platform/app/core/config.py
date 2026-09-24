from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Placement Intelligence Platform"
    environment: str = "development"
    database_url: str = "sqlite:///./placement_intelligence.db"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    rabbitmq_queue: str = "ingestion_jobs"
    internal_api_key: str = "change-me"
    llm_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Placement Intelligence Platform"
    environment: str = "development"

    # Supabase connection (primary data store via REST SDK)
    supabase_url: str = "https://your-project.supabase.co"
    supabase_key: str = "your-anon-or-service-role-key"

    # RabbitMQ / CloudAMQP connection
    amqp_url: str = "amqp://guest:guest@localhost:5672/"
    amqp_queue: str = "exp_queue"
    dry_run: bool = False

    # Security and AI pipeline
    internal_api_key: str = "change-me"
    llm_api_key: str | None = None

    # LLM / embedding configuration
    llm_model: str = "gemini-3.5-flash-lite"
    embedding_model: str = "text-embedding-004"

    # Feature flags
    web_search_enabled: bool = False
    vector_search_enabled: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


# Return a cached Settings instance so env vars are read once at startup
@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

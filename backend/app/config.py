from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="SMART_TODO_", extra="ignore")

    database_url: str = "sqlite:///./smart_todo.db"
    secret_key: str = "dev-secret-change-me-in-production-please-0123456789"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: list[str] = ["http://localhost:4173", "http://127.0.0.1:4173", "http://localhost:4317", "http://127.0.0.1:4317"]


settings = Settings()

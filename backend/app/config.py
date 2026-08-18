from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings loaded from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Local default is SQLite. Production (RDS) example:
    # postgresql+psycopg2://USER:PASSWORD@HOST:5432/pulsetrack
    database_url: str = "sqlite:///./pulse_track.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    firebase_project_id: str = ""
    firebase_private_key_id: str = ""
    firebase_private_key: str = ""
    firebase_client_email: str = ""
    firebase_client_id: str = ""
    firebase_client_cert_url: str = ""

    # When true (local only), accept Bearer tokens shaped as "dev:<uid>" without Firebase.
    # Never enable in production.
    dev_skip_auth: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        """Accept postgres:// or postgresql:// from RDS and pin the psycopg2 driver."""
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg2://" + url[len(prefix) :]
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()

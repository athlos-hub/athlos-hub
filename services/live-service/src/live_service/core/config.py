"""Configuração da aplicação (Pydantic Settings)."""

from pathlib import Path
from typing import Literal
from urllib.parse import quote_plus

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CURRENT_DIR = Path(__file__).resolve().parent
# src/live_service/core/config.py → service root (where .env lives) is three levels up
SERVICE_ROOT = CURRENT_DIR.parent.parent.parent


class Settings(BaseSettings):
    """Variáveis de ambiente do live-service."""

    model_config = SettingsConfigDict(
        env_file=[SERVICE_ROOT / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: Literal["dev", "prod"] = "dev"
    TRUST_GATEWAY: bool = True

    DATABASE_HOST: str
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str
    DATABASE_USER: str
    DATABASE_PASSWORD: str

    PORT: int = 8004

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None

    FRONTEND_BASE_URL: str = "http://localhost:3000"

    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str | None = None

    AUTH_SERVICE_URL: str = "http://localhost:8100"
    COMPETITIONS_SERVICE_URL: str = "http://localhost:8100"

    rabbitmq_url: str = Field(default="", alias="RABBITMQ_URL")

    LOG_LEVEL: str = Field(default="INFO", alias="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="text", alias="LOG_FORMAT")
    LOG_STARTUP_BANNER: bool = Field(default=False, alias="LOG_STARTUP_BANNER")

    @field_validator("ENV", mode="before")
    @classmethod
    def _normalize_env(cls, v: object) -> str:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return "dev"
        val = str(v).lower().strip()
        if val in ("production", "prod"):
            return "prod"
        if val in ("development", "dev"):
            return "dev"
        raise ValueError("ENV must be 'dev' or 'prod'")

    @field_validator("TRUST_GATEWAY", mode="before")
    @classmethod
    def _parse_trust_gateway(cls, v: object) -> bool:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return True
        if isinstance(v, bool):
            return v
        s = str(v).strip().lower()
        return s not in ("false", "0", "no")

    @model_validator(mode="after")
    def _trust_gateway_prod(self) -> "Settings":
        if self.ENV == "prod" and not self.TRUST_GATEWAY:
            raise ValueError("TRUST_GATEWAY cannot be false when ENV is prod")
        return self

    @property
    def database_url(self) -> str:
        user = quote_plus(self.DATABASE_USER)
        password = quote_plus(self.DATABASE_PASSWORD)
        return (
            f"postgresql+asyncpg://{user}:{password}@"
            f"{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )

    @property
    def google_redirect_uri_effective(self) -> str:
        return (
            self.GOOGLE_REDIRECT_URI
            or f"http://127.0.0.1:{self.PORT}/api/google-calendar/oauth/callback"
        )


settings = Settings()  # type: ignore[call-arg]

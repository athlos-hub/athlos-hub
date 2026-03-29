"""Configurações do serviço de notificações."""

import json
from pathlib import Path
from typing import List
from urllib.parse import quote_plus

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CURRENT_DIR = Path(__file__).resolve().parent
SERVICE_ROOT = CURRENT_DIR.parent.parent.parent


class Settings(BaseSettings):
    """Configurações da aplicação."""

    model_config = SettingsConfigDict(
        env_file=[SERVICE_ROOT / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: str = Field(default="dev")
    TRUST_GATEWAY: bool = Field(default=True)

    DATABASE_HOST: str = Field(default="localhost")
    DATABASE_PORT: int = Field(default=5432)
    DATABASE_NAME: str = Field(default="athlos_notifications")
    DATABASE_USER: str = Field(default="postgres")
    DATABASE_PASSWORD: str = Field(default="postgres")

    AUTH_SERVICE_URL: str = Field(default="http://localhost:8000")

    internal_api_key: str = Field(
        default="dev-notifications-internal-key",
        alias="NOTIFICATIONS_INTERNAL_API_KEY",
    )

    service_name: str = Field(default="notifications-service", alias="SERVICE_NAME")
    service_host: str = Field(default="0.0.0.0", alias="SERVICE_HOST")
    service_port: int = Field(default=8003, alias="SERVICE_PORT")
    debug: bool = Field(default=False, alias="DEBUG")

    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:8000,http://localhost:8100,https://athloshub.com.br",
        alias="ALLOWED_ORIGINS",
    )

    LOG_LEVEL: str = Field(default="INFO", alias="LOG_LEVEL")

    @field_validator("ENV", mode="before")
    @classmethod
    def _normalize_env(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return "dev"
        val = str(v).lower().strip()
        if val in ("production", "prod"):
            return "prod"
        if val in ("development", "dev"):
            return "dev"
        raise ValueError(
            "ENV must be 'dev' or 'prod' (aliases: development, production)"
        )

    @field_validator("TRUST_GATEWAY", mode="before")
    @classmethod
    def _parse_trust_gateway(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return True
        if isinstance(v, bool):
            return v
        s = str(v).strip().lower()
        return s not in ("false", "0", "no")

    @model_validator(mode="after")
    def _trust_gateway_required_in_prod(self):
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
    def cors_origins(self) -> List[str]:
        val = self.allowed_origins.strip()
        if val.startswith("["):
            try:
                parsed = json.loads(val)
                return [o.strip() for o in parsed if isinstance(o, str)]
            except json.JSONDecodeError:
                pass
        return [o.strip() for o in val.split(",") if o.strip()]


settings = Settings()

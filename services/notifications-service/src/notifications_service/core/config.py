"""Configurações do serviço de notificações."""

import json
from pathlib import Path
from typing import List

from pydantic import AliasChoices, Field
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

    ENV: str = Field(default="dev", alias="env")

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/athlos_notifications",
        validation_alias=AliasChoices("NOTIFICATIONS_DATABASE_URL", "DATABASE_URL"),
    )
    notifications_database_schema: str = Field(default="", alias="NOTIFICATIONS_DATABASE_SCHEMA")

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

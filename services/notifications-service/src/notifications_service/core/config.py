"""Configurações do serviço de notificações."""

from typing import List
import os
import json

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    database_url: str = Field(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/athlos_notifications",
        env="NOTIFICATIONS_DATABASE_URL",
    )
    notifications_database_schema: str = ""

    # Novu
    novu_api_key: str
    novu_app_id: str

    # Service
    service_name: str = "notifications-service"
    service_host: str = "0.0.0.0"
    service_port: int = 8003
    debug: bool = False

    # CORS
    # Accept either a comma-separated string or a JSON array string (as used in .env.production).
    allowed_origins: str = "http://localhost:3000,http://localhost:8000,http://athloshub.com.br"

    # Auth Service
    auth_service_url: str = "http://localhost:8001"

    @property
    def cors_origins(self) -> List[str]:
        """Retorna a lista de origens permitidas.

        Supports values like:
        - http://a,http://b
        - '["http://a"]'
        """
        val = self.allowed_origins
        if isinstance(val, (list, tuple)):
            return [origin.strip() for origin in val]

        if isinstance(val, str):
            val_str = val.strip()
            if (len(val_str) >= 2) and (
                (val_str[0] == val_str[-1]) and val_str[0] in ('"', "'")
            ):
                val_str = val_str[1:-1].strip()
            if val_str.startswith("["):
                try:
                    parsed = json.loads(val_str)
                    return [origin.strip() for origin in parsed if isinstance(origin, str)]
                except Exception:
                    pass

            return [origin.strip() for origin in val_str.split(",") if origin.strip()]


env_file = os.getenv("ENV_FILE")
if not env_file:
    env_name = os.getenv("ENV", "")
    env_file = ".env.production" if env_name.lower() == "prod" else ".env"

try:
    from dotenv import dotenv_values

    vals = dotenv_values(env_file, expand=True)
    for k, v in vals.items():
        if v is not None and k not in os.environ:
            os.environ[k] = v
except Exception:
    try:
        raw = {}
        with open(env_file, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip()
                    if (len(v) >= 2) and ((v[0] == v[-1]) and v[0] in ('"', "'")):
                        v = v[1:-1]
                    raw[k] = v

        for k, v in raw.items():
            if k not in os.environ:
                os.environ[k] = v

        for _ in range(5):
            changed = False
            for k, v in list(os.environ.items()):
                expanded = os.path.expandvars(v)
                if expanded != v:
                    os.environ[k] = expanded
                    changed = True
            if not changed:
                break
    except Exception:
        pass

settings = Settings(_env_file=env_file)
if "DATABASE_URL" in os.environ and "NOTIFICATIONS_DATABASE_URL" not in os.environ:
    os.environ["NOTIFICATIONS_DATABASE_URL"] = os.environ["DATABASE_URL"]
    settings = Settings(_env_file=env_file)

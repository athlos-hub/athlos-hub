import json
from pathlib import Path
from typing import List
from urllib.parse import quote_plus

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CURRENT_DIR = Path(__file__).resolve().parent
SERVICE_ROOT = CURRENT_DIR.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[SERVICE_ROOT / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: str = Field(default="dev")
    TRUST_GATEWAY: bool = Field(default=True)
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8001)

    SECRET_KEY: str = Field(default="test-secret-key-for-development") 
    ALGORITHM: str = Field(default="RS256")
    DATABASE_HOST: str = Field(default="localhost")
    DATABASE_PORT: int = Field(default=5432)
    DATABASE_NAME: str = Field(default="competitions_db")
    DATABASE_USER: str = Field(default="test_user")
    DATABASE_PASSWORD: str = Field(default="test_password")

    LIVESTREAM_SERVICE_URL: str = Field(default="http://localhost:8100")
    LIVESTREAM_SERVICE_TIMEOUT: int = Field(default=10)

    SOCIAL_SERVICE_URL: str = Field(default="http://localhost:8100")
    SOCIAL_SERVICE_TIMEOUT: int = Field(default=10)

    AUTH_SERVICE_URL: str = Field(default="http://localhost:8100")
    AUTH_SERVICE_TIMEOUT: int = Field(default=10)

    NOTIFICATIONS_SERVICE_URL: str = Field(default="http://localhost:8100")
    NOTIFICATIONS_INTERNAL_API_KEY: str = Field(default="")
    RABBITMQ_URL: str = Field(default="")
    
    FRONTEND_URL: str = Field(default="https://athloshub.com.br")

    DB_POOL_MIN_SIZE: int = Field(default=2)
    DB_POOL_MAX_SIZE: int = Field(default=10)
    DB_POOL_TIMEOUT: int = Field(default=30)

    CORS_ORIGINS_RAW: str = Field(default="", alias="CORS_ORIGINS")
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="json")
    LOG_STARTUP_BANNER: bool = Field(default=False)

    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Parse CORS_ORIGINS from string to list."""
        v = self.CORS_ORIGINS_RAW
        if not v or v.strip() == '':
            return []
        # Handle JSON format
        if v.startswith('['):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        # Handle comma-separated format
        return [origin.strip() for origin in v.split(',') if origin.strip()]

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


settings = Settings()
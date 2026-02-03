from pathlib import Path
from typing import List, Optional, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import json

CURRENT_DIR = Path(__file__).resolve().parent 
SERVICE_ROOT = CURRENT_DIR.parent.parent
MONOREPO_ROOT = SERVICE_ROOT.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[
            MONOREPO_ROOT / ".env",
            MONOREPO_ROOT / ".env.production",
            SERVICE_ROOT / ".env",
        ],
        env_file_encoding='utf-8',
        extra="ignore"
    )

    ENV: str = Field(default="prod", alias="env")
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8001)

    SECRET_KEY: str = Field(default="test-secret-key-for-development") 
    ALGORITHM: str = Field(default="RS256")
    KEYCLOAK_URL: str = Field(default="http://localhost:8080")
    KEYCLOAK_REALM: str = Field(default="athlos")

    COMPETITIONS_DATABASE_USER: str = Field(default="test_user")
    COMPETITIONS_DATABASE_PASSWORD: str = Field(default="test_password")
    COMPETITIONS_DATABASE_URL: str = Field(default="sqlite+aiosqlite:///:memory:")
    COMPETITIONS_DATABASE_SCHEMA: str = Field(default="public")

    LIVESTREAM_SERVICE_URL: str = Field(default="http://localhost:3333")
    LIVESTREAM_SERVICE_TIMEOUT: int = Field(default=10)

    DB_POOL_MIN_SIZE: int = Field(default=2)
    DB_POOL_MAX_SIZE: int = Field(default=10)
    DB_POOL_TIMEOUT: int = Field(default=30)

    CORS_ORIGINS_RAW: str = Field(default="", alias="CORS_ORIGINS")
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="json")

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

    @property
    def DATABASE_URL(self) -> str:
        """
        Retorna a URL de conexão. Se a URL completa existir, usa ela.
        Caso contrário, monta uma nova.
        """
        if self.COMPETITIONS_DATABASE_URL:
            url = self.COMPETITIONS_DATABASE_URL
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
            
        return (
            f"postgresql+asyncpg://{self.COMPETITIONS_DATABASE_USER}:"
            f"{self.COMPETITIONS_DATABASE_PASSWORD}@{self.API_HOST}:5432/"
            f"competitions_db?schema={self.COMPETITIONS_DATABASE_SCHEMA}"
        )

settings = Settings()
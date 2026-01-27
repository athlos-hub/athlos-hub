from pathlib import Path
from typing import List, Literal, Optional
from urllib.parse import quote_plus

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CURRENT_DIR = Path(__file__).resolve().parent
AUTH_SERVICE_ROOT = CURRENT_DIR.parent
SRC_ROOT = AUTH_SERVICE_ROOT.parent
SERVICE_ROOT = SRC_ROOT.parent
MONOREPO_ROOT = SERVICE_ROOT.parent.parent


class Settings(BaseSettings):
    """Configurações da aplicação."""

    model_config = SettingsConfigDict(
        env_file=[MONOREPO_ROOT / ".env", SERVICE_ROOT / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Environment
    # Accept common variants like 'production'/'prod' and 'development'/'dev'.
    ENV: str = Field(default="dev", alias="env")

    # Keycloak
    KEYCLOAK_URL: str
    KEYCLOAK_ISSUER: str = "http://athloshub.com.br/keycloak"
    KEYCLOAK_REALM: str
    KEYCLOAK_CLIENT_ID: str
    KEYCLOAK_CLIENT_SECRET: str
    # Admin creds for Keycloak (optional for runtime; Keycloak itself may manage admin user)
    KEYCLOAK_ADMIN_USERNAME: Optional[str] = None
    KEYCLOAK_ADMIN_PASSWORD: Optional[str] = None
    ALGORITHM: str

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Segurança
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Banco de dados
    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_NAME: str

    # Conexão com o keycloak
    KEYCLOAK_DATABASE_URL: str
    KEYCLOAK_DATABASE_USER: str
    KEYCLOAK_DATABASE_PASSWORD: str

    # Conexão com o schema de auth
    AUTH_DATABASE_USER: str
    AUTH_DATABASE_PASSWORD: str
    AUTH_DATABASE_URL: Optional[str] = None
    AUTH_DATABASE_SCHEMA: Optional[str] = None

    # Database Pool (optional with sensible defaults)
    DB_POOL_MIN_SIZE: int = 5
    DB_POOL_MAX_SIZE: int = 20
    DB_POOL_TIMEOUT: int = 30

    # CORS
    # Accept a JSON array from env; default to empty list to be safe
    CORS_ORIGINS: List[str] = []

    FRONTEND_URL: Optional[str] = None

    # Email Resend
    EMAIL_TOKEN_SECRET: str
    RESEND_API_KEY: str

    # Rate Limiting (optional)
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_PER_MINUTE: int = 60

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(levelname)s:%(name)s:%(message)s"

    NOTIFICATIONS_SERVICE_URL: str = "http://athloshub.com.br"

    # Bucket S3
    AWS_BUCKET_REGION: str
    AWS_BUCKET_NAME: str
    AWS_BUCKET_ACCESS_KEY_ID: str
    AWS_BUCKET_SECRET_ACCESS_KEY: str
    # Normalize ENV values (support 'production'/'prod' and 'development'/'dev')
    @field_validator("ENV", mode="before")
    def _normalize_env(cls, v):
        if v is None:
            return v
        val = str(v).lower()
        if val in ("production", "prod"):
            return "prod"
        if val in ("development", "dev"):
            return "dev"
        return val

    @property
    def database_url(self) -> str:
        """Constrói a URL do banco com URL encoding correto"""
        if self.AUTH_DATABASE_URL:
            return self.AUTH_DATABASE_URL
        
        user = quote_plus(self.AUTH_DATABASE_USER)
        password = quote_plus(self.AUTH_DATABASE_PASSWORD)
        return f"postgresql+asyncpg://{user}:{password}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"


settings = Settings()  # type: ignore
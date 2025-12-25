from pathlib import Path
from typing import List, Literal

from pydantic import Field
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
    ENV: Literal["dev", "prod"] = Field(default="dev", alias="env")

    # Keycloak
    KEYCLOAK_URL: str
    KEYCLOAK_REALM: str
    KEYCLOAK_CLIENT_ID: str
    KEYCLOAK_CLIENT_SECRET: str
    KEYCLOAK_ADMIN_USERNAME: str
    KEYCLOAK_ADMIN_PASSWORD: str
    ALGORITHM: str

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    # API
    API_HOST: str
    API_PORT: int

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
    AUTH_DATABASE_URL: str
    AUTH_DATABASE_SCHEMA: str

    # Database Pool
    DB_POOL_MIN_SIZE: int
    DB_POOL_MAX_SIZE: int
    DB_POOL_TIMEOUT: int

    # CORS
    CORS_ORIGINS: List[str]

    FRONTEND_URL: str

    # Email Resend
    EMAIL_TOKEN_SECRET: str
    RESEND_API_KEY: str

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool
    RATE_LIMIT_PER_MINUTE: int

    # Logging
    LOG_LEVEL: str
    LOG_FORMAT: str

    # Bucket S3
    AWS_BUCKET_REGION: str
    AWS_BUCKET_NAME: str
    AWS_BUCKET_ACCESS_KEY_ID: str
    AWS_BUCKET_SECRET_ACCESS_KEY: str


settings = Settings()  # type: ignore

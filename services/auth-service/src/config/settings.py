from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List

CURRENT_DIR = Path(__file__).resolve().parent
SERVICE_ROOT = CURRENT_DIR.parent.parent
MONOREPO_ROOT = SERVICE_ROOT.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[
            MONOREPO_ROOT / ".env",
            SERVICE_ROOT / ".env"
        ],
        env_file_encoding='utf-8',
        extra="ignore"
    )

    # Environment
    ENV: str = Field(default="dev", alias="env", description="Ambiente: dev ou prod")

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
    DATABASE_URL: str

    # Conexão com o schema de auth
    KEYCLOAK_DATABASE_URL: str
    KEYCLOAK_DATABASE_USER: str
    KEYCLOAK_DATABASE_PASSWORD: str
    KEYCLOAK_DATABASE_SCHEMA: str

    # Database Pool
    DB_POOL_MIN_SIZE: int
    DB_POOL_MAX_SIZE: int
    DB_POOL_TIMEOUT: int

    # CORS
    CORS_ORIGINS: List[str]

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool
    RATE_LIMIT_PER_MINUTE: int

    # Logging
    LOG_LEVEL: str
    LOG_FORMAT: str

settings = Settings()
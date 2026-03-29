from pathlib import Path
from typing import List, Optional
from urllib.parse import quote_plus

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CURRENT_DIR = Path(__file__).resolve().parent
AUTH_SERVICE_ROOT = CURRENT_DIR.parent
SRC_ROOT = AUTH_SERVICE_ROOT.parent
SERVICE_ROOT = SRC_ROOT.parent
class Settings(BaseSettings):
    """Configurações da aplicação."""

    model_config = SettingsConfigDict(
        env_file=[SERVICE_ROOT / ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Ambiente: apenas dev ou prod (aliases: development → dev, production → prod)
    ENV: str = Field(default="dev")

    # true em produção; false só em dev/testes (aceita X-Test-Sub / X-Test-Roles).
    TRUST_GATEWAY: bool = Field(default=True)

    # Keycloak
    KEYCLOAK_URL: str
    KEYCLOAK_ISSUER: str = "https://athloshub.com.br/keycloak"
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

    # Banco de dados (PostgreSQL da aplicação)
    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_NAME: str
    DATABASE_USER: str
    DATABASE_PASSWORD: str

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

    NOTIFICATIONS_SERVICE_URL: str = "http://notifications-service:8003"
    NOTIFICATIONS_INTERNAL_API_KEY: str = "dev-notifications-internal-key"
    COMPETITIONS_SERVICE_URL: str = "http://competitions-service:8001"

    # Bucket S3
    AWS_BUCKET_REGION: str
    AWS_BUCKET_NAME: str
    AWS_BUCKET_ACCESS_KEY_ID: str
    AWS_BUCKET_SECRET_ACCESS_KEY: str

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


settings = Settings()  # type: ignore
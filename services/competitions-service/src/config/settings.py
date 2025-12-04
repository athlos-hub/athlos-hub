from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

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

    ENV: str = Field(default="dev", alias="env")

    API_HOST: str 
    API_PORT: int 

    SECRET_KEY: str 
    ALGORITHM: str
    KEYCLOAK_URL: str
    KEYCLOAK_REALM: str

    COMPETITIONS_DATABASE_USER: str
    COMPETITIONS_DATABASE_PASSWORD: str
    COMPETITIONS_DATABASE_URL: str
    COMPETITIONS_DATABASE_SCHEMA: str
    

    CORS_ORIGINS: List[str]
    LOG_LEVEL: str
    LOG_FORMAT: str

settings = Settings()
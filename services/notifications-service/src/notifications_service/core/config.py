"""Configurações do serviço de notificações."""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/athlos_notifications"
    notifications_database_schema: str = "notifications_schema"

    # Novu
    novu_api_key: str
    novu_app_id: str

    # Service
    service_name: str = "notifications-service"
    service_host: str = "0.0.0.0"
    service_port: int = 8003
    debug: bool = False

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:8000"

    # Auth Service
    auth_service_url: str = "http://localhost:8001"

    @property
    def cors_origins(self) -> List[str]:
        """Retorna a lista de origens permitidas."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()

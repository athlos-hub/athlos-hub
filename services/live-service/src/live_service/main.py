"""Ponto de entrada ASGI (uvicorn: live_service.main:asgi_app)."""

from live_service.core.app import asgi_app

__all__ = ["asgi_app"]

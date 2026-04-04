"""Padrão Athlos Hub — logging consistente entre serviços (console + arquivo rotativo)."""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from typing import Literal

__all__ = [
    "RequestLoggerMiddleware",
    "log_service_event",
    "setup_logging",
]


def _normalize_format(raw: str | None) -> Literal["text", "json"]:
    s = (raw or "text").strip().lower()
    if s in ("json", "structured"):
        return "json"
    return "text"


class _ServiceFilter(logging.Filter):
    def __init__(self, service_name: str) -> None:
        super().__init__()
        self.service_name = service_name

    def filter(self, record: logging.LogRecord) -> bool:
        record.service = self.service_name  # type: ignore[attr-defined]
        return True


class _JsonFormatter(logging.Formatter):
    def __init__(self, service_name: str) -> None:
        super().__init__()
        self._service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, str | None] = {
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "service": self._service_name,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


class _AthlosTextFormatter(logging.Formatter):
    """Uma linha legível: tempo │ serviço │ nível │ logger │ mensagem."""

    LINE_FMT = "%(asctime)s │ %(service)s │ %(levelname)-8s │ %(name)s │ %(message)s"

    def __init__(self, *, datefmt: str, use_color: bool) -> None:
        super().__init__(fmt=self.LINE_FMT, datefmt=datefmt)
        self._use_color = use_color
        self._colors = {
            "DEBUG": "\033[2;36m",
            "INFO": "\033[32m",
            "WARNING": "\033[33m",
            "ERROR": "\033[31m",
            "CRITICAL": "\033[1;31m",
        }
        self._reset = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        line = super().format(record)
        if self._use_color and sys.stdout.isatty():
            c = self._colors.get(record.levelname, "")
            if c:
                return f"{c}{line}{self._reset}"
        return line


def _quiet_third_party() -> None:
    for name, level in (
        ("urllib3", logging.WARNING),
        ("httpx", logging.WARNING),
        ("httpcore", logging.WARNING),
        ("asyncpg", logging.WARNING),
        ("uvicorn.access", logging.WARNING),
        ("aio_pika", logging.WARNING),
        ("socketio", logging.WARNING),
        ("engineio", logging.WARNING),
    ):
        logging.getLogger(name).setLevel(level)


def setup_logging(
    *,
    service_name: str,
    log_level_str: str,
    env: str,
    log_format: str = "text",
    log_dir: str = "logs",
    enable_file_handlers: bool = True,
    show_banner: bool = False,
) -> None:
    """Configura o root logger: stdout (+ arquivos opcionais), formato Athlos."""
    try:
        os.makedirs(log_dir, exist_ok=True)
    except OSError:
        pass

    level = getattr(logging, log_level_str.upper(), logging.INFO)
    fmt_kind = _normalize_format(log_format)
    env_l = (env or "dev").strip().lower()
    use_color = fmt_kind == "text" and env_l in ("dev", "development", "local")

    service_filter = _ServiceFilter(service_name)

    if fmt_kind == "json":
        console_formatter: logging.Formatter = _JsonFormatter(service_name)
    else:
        console_formatter = _AthlosTextFormatter(
            datefmt="%Y-%m-%d %H:%M:%S",
            use_color=use_color,
        )

    console = logging.StreamHandler(sys.stdout)
    console.setLevel(level)
    console.addFilter(service_filter)
    console.setFormatter(console_formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(console)

    if enable_file_handlers:
        if fmt_kind == "json":
            file_formatter: logging.Formatter = _JsonFormatter(service_name)
        else:
            file_formatter = logging.Formatter(
                fmt=_AthlosTextFormatter.LINE_FMT,
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        fh = RotatingFileHandler(
            filename=os.path.join(log_dir, "app.log"),
            maxBytes=5 * 1024 * 1024,
            backupCount=3,
            encoding="utf-8",
        )
        fh.setLevel(level)
        fh.addFilter(service_filter)
        fh.setFormatter(file_formatter)

        eh = RotatingFileHandler(
            filename=os.path.join(log_dir, "errors.log"),
            maxBytes=2 * 1024 * 1024,
            backupCount=2,
            encoding="utf-8",
        )
        eh.setLevel(logging.ERROR)
        eh.addFilter(service_filter)
        eh.setFormatter(file_formatter)

        root.addHandler(fh)
        root.addHandler(eh)

    _quiet_third_party()

    if show_banner:
        startup = logging.getLogger("app.startup")
        bar = "═" * 62
        startup.info(bar)
        startup.info(
            "  Athlos Hub · %-22s · env=%-6s · %-5s · %s",
            service_name,
            env_l,
            log_level_str.upper(),
            fmt_kind,
        )
        startup.info(bar)


def log_service_event(
    logger: logging.Logger,
    phase: str,
    detail: str,
    *,
    exc_info: bool | None = None,
) -> None:
    """Evento de lifecycle: fase em destaque + detalhe."""
    logger.info("[%s] %s", phase.upper(), detail, exc_info=exc_info)


class RequestLoggerMiddleware:
    """Regista pedidos HTTP relevantes no logger ``app.audit``."""

    def __init__(
        self,
        app,
        *,
        service_name: str = "unknown-service",
        always_log_paths: list[str] | None = None,
    ):
        self.app = app
        self.service_name = service_name
        self.logger = logging.getLogger("app.audit")
        self.always_log_paths = tuple(always_log_paths or [])

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope["method"]
        path = scope["path"]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message["status"]
                should_log = status_code >= 400 or any(
                    path.startswith(p) for p in self.always_log_paths
                )
                if should_log:
                    lvl = (
                        logging.ERROR
                        if status_code >= 500
                        else logging.WARNING
                        if status_code >= 400
                        else logging.INFO
                    )
                    self.logger.log(
                        lvl,
                        "AUDIT │ %s │ %s %s → %s",
                        self.service_name,
                        method,
                        path,
                        status_code,
                    )
            await send(message)

        await self.app(scope, receive, send_wrapper)

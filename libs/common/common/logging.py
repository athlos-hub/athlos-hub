import logging
import sys
import os
from logging.handlers import RotatingFileHandler


def setup_logging(log_level_str: str, env: str, log_dir: str = "logs"):
    """
    Configura o sistema de logs.
    Args:
        log_level_str: Ex: "INFO", "DEBUG"
        env: Ex: "dev", "prod"
    """
    try:
        os.makedirs(log_dir, exist_ok=True)
    except Exception:
        pass

    log_level = getattr(logging, log_level_str.upper(), logging.INFO)

    log_format = logging.Formatter(
        fmt='[%(asctime)s] [%(levelname)s] %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(log_format)

    file_handler = RotatingFileHandler(
        filename=f"{log_dir}/app.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding='utf-8'
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(log_format)

    error_handler = RotatingFileHandler(
        filename=f"{log_dir}/errors.log",
        maxBytes=2 * 1024 * 1024,
        backupCount=2,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(log_format)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)

    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    logger = logging.getLogger("app.startup")
    logger.info(f"Logging configurado. Ambiente: {env}")


class RequestLoggerMiddleware:
    def __init__(self, app, always_log_paths: list[str] = None):
        self.app = app
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

                should_log = (
                        status_code >= 400 or
                        any(path.startswith(p) for p in self.always_log_paths)
                )

                if should_log:
                    level = logging.ERROR if status_code >= 500 else logging.WARNING if status_code >= 400 else logging.INFO
                    self.logger.log(level, f"AUDIT: {method} {path} -> {status_code}")

            await send(message)

        await self.app(scope, receive, send_wrapper)
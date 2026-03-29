"""Variáveis de ambiente mínimas antes de importar `live_service.core.config`."""

import os

os.environ.setdefault("ENV", "dev")
os.environ.setdefault("TRUST_GATEWAY", "true")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("DATABASE_NAME", "test_db")
os.environ.setdefault("DATABASE_USER", "test")
os.environ.setdefault("DATABASE_PASSWORD", "test")

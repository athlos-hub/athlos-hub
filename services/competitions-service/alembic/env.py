import sys
from logging.config import fileConfig
from pathlib import Path
from sqlalchemy import engine_from_config, pool
from alembic import context

# 1. Ajuste do Path para encontrar o 'src'
# Localização: services/competitions-service/alembic/env.py
# Subindo dois níveis para chegar em services/competitions-service/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.config.settings import settings
from src.models import Base  # Certifique-se que seus modelos importam do Base correto

# 2. Configuração de logs do Alembic
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def get_url():
    """
    Traduz a URL do Pydantic (asyncpg) para o formato que o Alembic (síncrono) entende.
    """
    url = settings.DATABASE_URL
    if "postgresql+asyncpg://" in url:
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    
    # Escapa o caractere '%' para evitar que o SQLAlchemy tente interpretar como variável
    return url.replace("%", "%%")

def run_migrations_offline() -> None:
    """Executa migrações em modo 'offline' (gera scripts SQL)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Executa migrações em modo 'online' (conecta direto no banco)."""
    
    # Sobrescreve a URL no objeto de configuração do Alembic
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True  # Detecta mudanças de tipo de coluna (ex: String(50) -> String(100))
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# ----------------------------------------------------------------------
# 1. SETUP DE PATH
# Adiciona o diretório atual ao path do Python. 
# Isso permite importar "src.config" mesmo rodando o comando da raiz.
# ----------------------------------------------------------------------
sys.path.append(os.getcwd())

# Import do settings
from src.config.settings import settings

# Importa os models
from src.models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Sobrescreve URL do banco
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Linkar os metadados para o autogenerate funcionar
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    
    # Cria a engine usando a configuração injetada acima
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
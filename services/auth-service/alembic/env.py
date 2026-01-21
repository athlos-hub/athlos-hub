import os
import sys
from logging.config import fileConfig
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool, text

from alembic import context

service_env = Path(__file__).resolve().parents[1] / ".env"
if service_env.exists():
    load_dotenv(service_env)

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from auth_service.infrastructure.database.base import Base
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationOrganizer,
)
from auth_service.infrastructure.database.models.user_model import User

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url():
    db_url = os.getenv("AUTH_DATABASE_URL")
    db_user = os.getenv("AUTH_DATABASE_USER")
    db_password = os.getenv("AUTH_DATABASE_PASSWORD")

    assert db_user, "AUTH_DATABASE_USER não definido no .env"
    assert db_password, "AUTH_DATABASE_PASSWORD não definido no .env"

    if db_url:
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        return db_url

    raise RuntimeError("AUTH_DATABASE_URL não definido no .env")


def get_schema():
    return os.getenv("AUTH_DATABASE_SCHEMA", "auth_schema")


def include_object(obj, name, type_, reflected, compare_to):
    schema = get_schema()

    if type_ == "table":
        return obj.schema == schema or obj.schema is None

    parent = getattr(obj, "table", None)
    if parent is not None:
        return parent.schema == schema or parent.schema is None

    return True


def run_migrations_offline():
    url = get_url()

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_schemas=True,
        include_object=include_object,
        version_table_schema=get_schema(),
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    configuration = config.get_section(config.config_ini_section, {})
    db_url = get_url()

    configuration["sqlalchemy.url"] = db_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    schema = get_schema()

    with connectable.connect() as connection:
        connection.execute(text(f"SET search_path TO {schema}, public"))
        connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            include_object=include_object,
            version_table_schema=schema,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

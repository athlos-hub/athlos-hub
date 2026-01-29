"""Configuração do Alembic para migrações."""

import os
import asyncio
from logging.config import fileConfig
from pathlib import Path
from urllib.parse import quote_plus, urlparse, urlunparse

from sqlalchemy import engine_from_config, pool, text
from sqlalchemy.engine import Connection

from alembic import context

# Carregar .env se existir (apenas para dev local)
service_env = Path(__file__).resolve().parents[1] / ".env"
if service_env.exists():
    try:
        from dotenv import load_dotenv

        load_dotenv(service_env)
    except Exception:
        # ignore if dotenv not available
        pass

# Importa a configuração
from notifications_service.core.config import settings

# Importa os modelos
from database.base import Base
from notifications_service.infrastructure.database.models import Notification

# this is the Alembic Config object
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url():
    db_url = os.getenv("NOTIFICATIONS_DATABASE_URL") or os.getenv("DATABASE_URL")
    db_user = os.getenv("NOTIFICATIONS_DATABASE_USER")
    db_password = os.getenv("NOTIFICATIONS_DATABASE_PASSWORD")

    if db_url:
        # normalize asyncpg scheme to postgres scheme for Alembic
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

        parsed = urlparse(db_url)

        user = parsed.username or db_user
        password = parsed.password or db_password
        host = parsed.hostname or os.getenv("DATABASE_HOST", "localhost")
        port = parsed.port or int(os.getenv("DATABASE_PORT", "5432"))

        quoted_user = quote_plus(user) if user is not None else ""
        quoted_password = quote_plus(password) if password is not None else ""

        if quoted_user or quoted_password:
            netloc = f"{quoted_user}:{quoted_password}@{host}:{port}"
        else:
            netloc = parsed.netloc

        rebuilt = urlunparse((
            parsed.scheme or "postgresql",
            netloc,
            parsed.path or "",
            parsed.params or "",
            parsed.query or "",
            parsed.fragment or "",
        ))
        return rebuilt

    # Fallback: build from components
    host = os.getenv("DATABASE_HOST", "localhost")
    port = os.getenv("DATABASE_PORT", "5432")
    dbname = os.getenv("DATABASE_NAME") or os.getenv("NOTIFICATIONS_DATABASE_NAME")

    if not dbname:
        # If settings.database_url is present, let config use it
        if settings.database_url:
            return settings.database_url
        raise RuntimeError("NOTIFICATIONS_DATABASE_URL não definido e DATABASE_NAME ausente")

    return f"postgresql://{quote_plus(db_user)}:{quote_plus(db_password)}@{host}:{port}/{dbname}"


def get_schema():
    v = os.getenv("NOTIFICATIONS_DATABASE_SCHEMA")
    return v if v and v.strip() != "" else None


def include_object(obj, name, type_, reflected, compare_to):
    schema = get_schema()

    if schema is None:
        return True

    if type_ == "table":
        return obj.schema == schema or obj.schema is None

    parent = getattr(obj, "table", None)
    if parent is not None:
        return parent.schema == schema or parent.schema is None

    return True


def _monkeypatch_op_strip_schema(schema_name: str) -> None:
    """When running without a configured schema, some migration files may
    contain explicit schema='notifications_schema' or use names prefixed
    with the schema. To support running those migrations in production
    (where we don't use a custom schema), monkeypatch alembic.op helpers
    to strip the schema kwarg and remove schema prefixes from names.
    """
    try:
        import alembic.op as alembic_op

        # patch create_table and drop_table to ignore schema kwarg
        _orig_create_table = getattr(alembic_op, "create_table", None)
        if _orig_create_table:
            def _create_table_no_schema(*args, **kwargs):
                kwargs.pop("schema", None)
                return _orig_create_table(*args, **kwargs)

            alembic_op.create_table = _create_table_no_schema

        _orig_drop_table = getattr(alembic_op, "drop_table", None)
        if _orig_drop_table:
            def _drop_table_no_schema(*args, **kwargs):
                kwargs.pop("schema", None)
                return _orig_drop_table(*args, **kwargs)

            alembic_op.drop_table = _drop_table_no_schema

        # patch create_index/drop_index to ignore schema kwarg and strip schema prefix from names
        _orig_create_index = getattr(alembic_op, "create_index", None)
        if _orig_create_index:
            def _create_index_no_schema(name, *a, **kw):
                kw.pop("schema", None)
                if isinstance(name, str) and name.startswith(f"{schema_name}_"):
                    name = name[len(schema_name) + 1:]
                return _orig_create_index(name, *a, **kw)

            alembic_op.create_index = _create_index_no_schema

        _orig_drop_index = getattr(alembic_op, "drop_index", None)
        if _orig_drop_index:
            def _drop_index_no_schema(name, *a, **kw):
                kw.pop("schema", None)
                if isinstance(name, str) and name.startswith(f"{schema_name}_"):
                    name = name[len(schema_name) + 1:]
                return _orig_drop_index(name, *a, **kw)

            alembic_op.drop_index = _drop_index_no_schema

        # patch op.f to strip schema prefix in autogen-generated names
        _orig_f = getattr(alembic_op, "f", None)
        if _orig_f:
            def _f_no_schema(name):
                if isinstance(name, str) and name.startswith(f"{schema_name}_"):
                    return name[len(schema_name) + 1:]
                return name

            alembic_op.f = _f_no_schema

    except Exception:
        # best-effort patch; if it fails, proceed and let Alembic run normally
        pass


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    cfg_kwargs = dict(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
        compare_type=True,
        compare_server_default=True,
    )

    schema = get_schema()
    if schema is not None:
        cfg_kwargs["include_schemas"] = True
        cfg_kwargs["version_table_schema"] = schema

    context.configure(**cfg_kwargs)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
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
        if schema is not None:
            connection.execute(text(f"SET search_path TO {schema}, public"))
            connection.commit()

        cfg_kwargs = dict(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
        )

        if schema is not None:
            cfg_kwargs["include_schemas"] = True
            cfg_kwargs["version_table_schema"] = schema

        context.configure(**cfg_kwargs)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    # If no schema is configured, some existing migration files may reference
    # 'notifications_schema' explicitly; patch alembic.op to ignore schema
    # qualifiers so migrations run against the DB default schema.
    if get_schema() is None:
        _monkeypatch_op_strip_schema("notifications_schema")
    run_migrations_online()

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool, text
from urllib.parse import quote_plus, urlparse, urlunparse

from alembic import context

# Carregar .env se existir (apenas para dev local)
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
    
    # ✅ DEBUG: Imprimir o que está chegando
    print(f"DEBUG - AUTH_DATABASE_URL: {db_url}")
    print(f"DEBUG - AUTH_DATABASE_USER: {db_user}")
    print(f"DEBUG - AUTH_DATABASE_PASSWORD: {'***' if db_password else None}")
    print(f"DEBUG - DATABASE_HOST: {os.getenv('DATABASE_HOST')}")
    print(f"DEBUG - DATABASE_PORT: {os.getenv('DATABASE_PORT')}")
    print(f"DEBUG - DATABASE_NAME: {os.getenv('DATABASE_NAME')}")
    
    if not db_user:
        raise RuntimeError("AUTH_DATABASE_USER não definido nas variáveis de ambiente")
    if not db_password:
        raise RuntimeError("AUTH_DATABASE_PASSWORD não definido nas variáveis de ambiente")
    
    # If a full URL is provided, normalize scheme and ensure credentials are URL-encoded
    if db_url:
        print(f"DEBUG - Usando AUTH_DATABASE_URL")
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

        parsed = urlparse(db_url)
        
        print(f"DEBUG - parsed.username: {parsed.username}")
        print(f"DEBUG - parsed.hostname: {parsed.hostname}")
        print(f"DEBUG - parsed.port: {parsed.port}")
        print(f"DEBUG - parsed.path: {parsed.path}")

        # prefer credentials from the URL, fall back to explicit env vars
        user = parsed.username or db_user
        password = parsed.password or db_password

        # build a safe netloc with quoted credentials
        host = parsed.hostname or os.getenv("DATABASE_HOST", "localhost")
        port = parsed.port or int(os.getenv("DATABASE_PORT", "5432"))

        quoted_user = quote_plus(user) if user is not None else ""
        quoted_password = quote_plus(password) if password is not None else ""

        if quoted_user or quoted_password:
            netloc = f"{quoted_user}:{quoted_password}@{host}:{port}"
        else:
            # fallback to original netloc if no credentials available
            netloc = parsed.netloc

        rebuilt = urlunparse((
            parsed.scheme or "postgresql", 
            netloc, 
            parsed.path or "", 
            parsed.params or "", 
            parsed.query or "", 
            parsed.fragment or ""
        ))
        print(f"DEBUG - URL reconstruída: {rebuilt.replace(quoted_password, '***')}")
        return rebuilt

    # If no full URL provided, construct one from components and quote credentials
    print(f"DEBUG - Construindo URL a partir de componentes")
    host = os.getenv("DATABASE_HOST", "localhost")
    port = os.getenv("DATABASE_PORT", "5432")
    dbname = os.getenv("DATABASE_NAME")

    if not dbname:
        raise RuntimeError("AUTH_DATABASE_URL não definido e DATABASE_NAME ausente")

    url = f"postgresql://{quote_plus(db_user)}:{quote_plus(db_password)}@{host}:{port}/{dbname}"
    print(f"DEBUG - URL construída: postgresql://{quote_plus(db_user)}:***@{host}:{port}/{dbname}")
    return url

def get_schema():
    """Return the schema name or None.

    If AUTH_DATABASE_SCHEMA is not set, return None which means migrations
    operate against the database default schema (production behavior).
    """
    v = os.getenv("AUTH_DATABASE_SCHEMA")
    return v if v and v.strip() != "" else None


def include_object(obj, name, type_, reflected, compare_to):
    schema = get_schema()

    # If no schema is configured, include everything (use DB default)
    if schema is None:
        return True

    if type_ == "table":
        return obj.schema == schema or obj.schema is None

    parent = getattr(obj, "table", None)
    if parent is not None:
        return parent.schema == schema or parent.schema is None

    return True


def run_migrations_offline():
    url = get_url()

    cfg_kwargs = dict(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
    )

    schema = get_schema()
    if schema is not None:
        cfg_kwargs["include_schemas"] = True
        cfg_kwargs["version_table_schema"] = schema

    context.configure(**cfg_kwargs)

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
    run_migrations_online()
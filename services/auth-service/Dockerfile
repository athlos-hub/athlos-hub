FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry==2.1.2

COPY libs/common /app/libs/common
COPY libs/database /app/libs/database
COPY libs/upload_s3 /app/libs/upload_s3

WORKDIR /app/libs/common
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi

WORKDIR /app/libs/database
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi

WORKDIR /app/libs/upload_s3
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi

WORKDIR /app/services/auth-service
COPY services/auth-service/pyproject.toml services/auth-service/poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi --only main

COPY services/auth-service/src ./src

FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

COPY --from=builder --chown=appuser:appuser /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder --chown=appuser:appuser /usr/local/bin /usr/local/bin
COPY --from=builder --chown=appuser:appuser /app/services/auth-service/src ./src
COPY --from=builder --chown=appuser:appuser /app/libs /app/libs
COPY --chown=appuser:appuser services/auth-service/entrypoint.sh ./entrypoint.sh
COPY --chown=appuser:appuser services/auth-service/alembic.ini ./services/auth-service/alembic.ini
COPY --chown=appuser:appuser services/auth-service/alembic ./services/auth-service/alembic
COPY --chown=appuser:appuser services/auth-service/scripts ./services/auth-service/scripts

# ensure runtime files are owned by non-root user
RUN chown -R appuser:appuser /app

USER appuser

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/src:/app/src/auth_service:/app/libs/common:/app/libs/database:/app/libs/upload_s3

EXPOSE 8000

RUN chmod +x /app/entrypoint.sh /app/services/auth-service/scripts/*.sh || true

ENTRYPOINT ["/app/entrypoint.sh"]

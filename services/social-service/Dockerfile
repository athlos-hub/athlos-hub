FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry==2.1.2

WORKDIR /app/services/social-service
COPY services/social-service/pyproject.toml services/social-service/poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi --only main

COPY services/social-service/src ./src

FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

COPY --from=builder --chown=appuser:appuser /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder --chown=appuser:appuser /usr/local/bin /usr/local/bin
COPY --from=builder --chown=appuser:appuser /app/services/social-service/src ./src
COPY --chown=appuser:appuser services/social-service/entrypoint.sh ./entrypoint.sh
COPY --chown=appuser:appuser services/social-service/alembic.ini ./alembic.ini
COPY --chown=appuser:appuser services/social-service/alembic ./alembic
COPY --chown=appuser:appuser services/social-service/scripts ./services/social-service/scripts

RUN chown -R appuser:appuser /app

USER appuser

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app:/app/src

EXPOSE 8083

RUN chmod +x /app/entrypoint.sh /app/services/social-service/scripts/*.sh || true

ENTRYPOINT ["/app/entrypoint.sh"]

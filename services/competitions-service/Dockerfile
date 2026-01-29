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

WORKDIR /app/libs/common
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi

WORKDIR /app/libs/database
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi

WORKDIR /app/services/competitions-service
COPY services/competitions-service/pyproject.toml services/competitions-service/poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi --only main

COPY services/competitions-service/src ./src

FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

COPY --from=builder --chown=appuser:appuser /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder --chown=appuser:appuser /usr/local/bin /usr/local/bin
COPY --from=builder --chown=appuser:appuser /app/services/competitions-service/src ./src
COPY --from=builder --chown=appuser:appuser /app/libs /app/libs

# ensure runtime files are owned by non-root user
RUN chown -R appuser:appuser /app

USER appuser

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app:/app/libs/common:/app/libs/database

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]

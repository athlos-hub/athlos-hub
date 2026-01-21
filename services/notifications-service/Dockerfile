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

WORKDIR /app/services/notifications-service
COPY services/notifications-service/pyproject.toml services/notifications-service/poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi --only main

COPY services/notifications-service/src ./src

FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app/services/notifications-service/src ./src
COPY --from=builder /app/libs /app/libs

USER appuser

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/src:/app/src/notifications_service:/app/libs/common:/app/libs/database

EXPOSE 8003

CMD ["uvicorn", "notifications_service.main:app", "--host", "0.0.0.0", "--port", "8003"]

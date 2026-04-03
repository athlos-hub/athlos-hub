FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

COPY services/live-service/pyproject.toml /app/services/live-service/
COPY services/live-service/src /app/services/live-service/src
COPY services/live-service/alembic.ini /app/services/live-service/
COPY services/live-service/alembic /app/services/live-service/alembic

RUN pip install --no-cache-dir pip setuptools wheel \
    && pip install --no-cache-dir -e /app/services/live-service

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/services/live-service/src

USER appuser

EXPOSE 8004

WORKDIR /app/services/live-service

CMD ["uvicorn", "live_service.main:asgi_app", "--host", "0.0.0.0", "--port", "8004"]

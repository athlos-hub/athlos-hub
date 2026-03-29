#!/bin/bash

export PYTHONDONTWRITEBYTECODE=1
export OAUTHLIB_INSECURE_TRANSPORT=1
export PYTHONPATH="$(pwd)/src"

poetry run uvicorn live_service.main:asgi_app --host 0.0.0.0 --port 8004 --reload
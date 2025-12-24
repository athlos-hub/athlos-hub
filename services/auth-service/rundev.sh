#!/bin/bash

export PYTHONDONTWRITEBYTECODE=1
export OAUTHLIB_INSECURE_TRANSPORT=1
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"

poetry run uvicorn auth_service.main:app --host 0.0.0.0 --port 8000 --reload
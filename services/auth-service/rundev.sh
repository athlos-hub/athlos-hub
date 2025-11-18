#!/bin/bash

export PYTHONDONTWRITEBYTECODE=1
export OAUTHLIB_INSECURE_TRANSPORT=1

poetry run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
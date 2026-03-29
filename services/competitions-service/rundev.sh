#!/bin/bash

set -e

cd "$(dirname "$0")"
export PYTHONPATH="$(pwd)/src:$(pwd)"

poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8001
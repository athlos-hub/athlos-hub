#!/bin/bash

set -e

echo "🚀 Iniciando Competitions Service na porta 8001..."

poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8001
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"

poetry run uvicorn notifications_service.main:app --reload --host 0.0.0.0 --port 8003

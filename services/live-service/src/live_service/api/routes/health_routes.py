import time

from fastapi import APIRouter

router = APIRouter(tags=["health"])

_START = time.time()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptime": time.time() - _START,
    }

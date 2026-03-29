"""Webhooks MediaMTX (sem autenticação)."""

import time
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request, status

from live_service.api.deps import WebhookServiceDep
from live_service.schemas.webhook import MediaMTXAuthBody, OnPublishDoneBody

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

_RATE: dict[str, list[float]] = defaultdict(list)
_WINDOW_SEC = 60
_MAX_REQ = 10


def _rate_limit_mediamtx(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - _WINDOW_SEC
    bucket = _RATE[client]
    while bucket and bucket[0] < window_start:
        bucket.pop(0)
    if len(bucket) >= _MAX_REQ:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
    bucket.append(now)


@router.post("/mediamtx-auth", status_code=200)
async def mediamtx_auth(
    request: Request,
    body: MediaMTXAuthBody,
    svc: WebhookServiceDep,
) -> None:
    _rate_limit_mediamtx(request)
    await svc.mediamtx_auth(body)


@router.post("/on-publish-done", status_code=200)
async def on_publish_done(body: OnPublishDoneBody, svc: WebhookServiceDep) -> None:
    await svc.on_publish_done(body)

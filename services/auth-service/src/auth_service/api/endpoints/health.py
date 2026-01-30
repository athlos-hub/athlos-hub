"""Endpoints de health"""

from fastapi import APIRouter
import logging

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "ok", "service": "auth-service"}
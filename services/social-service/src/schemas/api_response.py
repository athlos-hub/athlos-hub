from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any


def paginated_payload(
    content: list[Any],
    *,
    total_elements: int,
    page: int,
    size: int,
) -> dict[str, Any]:
    """Envelope de página alinhado ao contrato legado (content, totalElements, …)."""
    total_pages = (total_elements + size - 1) // size if size > 0 else 0
    return {
        "content": content,
        "totalElements": total_elements,
        "totalPages": total_pages,
        "size": size,
        "number": page,
        "first": page == 0,
        "last": page >= max(total_pages - 1, 0) if total_pages else True,
        "empty": len(content) == 0,
        "numberOfElements": len(content),
    }


spring_page = paginated_payload


def api_success(
    data: Any,
    message: str | None = None,
) -> dict[str, Any]:
    out: dict[str, Any] = {
        "success": True,
        "data": data,
        "timestamp": datetime.now().isoformat(),
    }
    if message is not None:
        out["message"] = message
    return out


def api_error(message: str, error_code: str | None = None) -> dict[str, Any]:
    d: dict[str, Any] = {
        "success": False,
        "message": message,
        "timestamp": datetime.now().isoformat(),
    }
    if error_code:
        d["errorCode"] = error_code
    return d


def uuid_from_str(s: str) -> uuid.UUID:
    return uuid.UUID(str(s))

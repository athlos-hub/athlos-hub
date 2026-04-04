from __future__ import annotations

from datetime import datetime


def iso_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()

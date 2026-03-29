"""Cliente Google Calendar API (googleapiclient)."""

from typing import Any

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def build_calendar_v3_service(access_token: str) -> Any:
    creds = Credentials(token=access_token)
    return build("calendar", "v3", credentials=creds, cache_discovery=False)

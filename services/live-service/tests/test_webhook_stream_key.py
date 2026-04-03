"""Extração de stream key a partir do path MediaMTX."""

from live_service.services.webhook_service import extract_stream_key


def test_extract_stream_key_from_slash_live_key():
    assert extract_stream_key("/live/abc123") == "abc123"


def test_extract_stream_key_from_live_key():
    assert extract_stream_key("live/abc123") == "abc123"


def test_extract_stream_key_strips_query():
    assert extract_stream_key("live/abc?x=1") == "abc"


def test_extract_stream_key_empty_for_bare_live():
    assert extract_stream_key("live") == ""
    assert extract_stream_key("/live") == ""

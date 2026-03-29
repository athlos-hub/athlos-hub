"""Testes de identidade Kong (headers)."""

from unittest.mock import patch

from live_service.common.gateway_identity import resolve_gateway_sub


def test_resolve_sub_prefers_keycloak():
    with patch("live_service.common.gateway_identity.settings") as s:
        s.TRUST_GATEWAY = True
        s.ENV = "dev"
        assert resolve_gateway_sub("user-1", "test-2") == "user-1"


def test_resolve_sub_uses_test_when_untrusted_non_prod():
    with patch("live_service.common.gateway_identity.settings") as s:
        s.TRUST_GATEWAY = False
        s.ENV = "dev"
        assert resolve_gateway_sub(None, "test-99") == "test-99"


def test_resolve_sub_returns_none_when_missing():
    with patch("live_service.common.gateway_identity.settings") as s:
        s.TRUST_GATEWAY = True
        s.ENV = "dev"
        assert resolve_gateway_sub(None, None) is None

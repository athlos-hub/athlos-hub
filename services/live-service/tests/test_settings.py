"""Validação de Settings (TRUST_GATEWAY + ENV)."""

import pytest

from live_service.core.config import Settings

_DB = {
    "DATABASE_HOST": "localhost",
    "DATABASE_PORT": 5432,
    "DATABASE_NAME": "db",
    "DATABASE_USER": "u",
    "DATABASE_PASSWORD": "p",
}


def test_trust_gateway_false_in_prod_raises():
    with pytest.raises(ValueError, match="TRUST_GATEWAY"):
        Settings.model_validate(
            {
                "ENV": "prod",
                "TRUST_GATEWAY": False,
                **_DB,
            }
        )


def test_trust_gateway_false_in_dev_ok():
    s = Settings.model_validate(
        {
            "ENV": "dev",
            "TRUST_GATEWAY": False,
            **_DB,
        }
    )
    assert s.TRUST_GATEWAY is False
    assert s.ENV == "dev"


def test_database_url_uses_asyncpg_and_credentials():
    s = Settings.model_validate({**_DB, "DATABASE_PASSWORD": "x:y@z"})
    url = s.database_url
    assert url.startswith("postgresql+asyncpg://")
    assert "localhost" in url
    assert "/db" in url

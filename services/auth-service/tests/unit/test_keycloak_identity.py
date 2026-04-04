"""Testes para build_keycloak_identity_update."""

from auth_service.utils.keycloak_identity import build_keycloak_identity_update


def test_merge_preserves_email_when_only_first_name_changes():
    existing = {
        "username": "u1",
        "email": "keep@example.com",
        "firstName": "Old",
        "lastName": "Last",
    }
    partial = {"firstName": "New"}
    out = build_keycloak_identity_update(existing, partial)
    assert out == {
        "username": "u1",
        "email": "keep@example.com",
        "firstName": "New",
        "lastName": "Last",
    }


def test_only_four_keys_in_output():
    existing = {
        "username": "u",
        "email": "e@e.com",
        "firstName": "A",
        "lastName": "B",
        "attributes": {"x": ["y"]},
    }
    out = build_keycloak_identity_update(existing, {})
    assert set(out.keys()) <= {"username", "email", "firstName", "lastName"}
    assert "attributes" not in out

"""Atualização de identidade no Keycloak: apenas username, email, firstName, lastName."""

from typing import Any

_IDENTITY_KEYS = ("username", "email", "firstName", "lastName")


def build_keycloak_identity_update(
    existing: dict[str, Any], partial: dict[str, Any]
) -> dict[str, Any]:
    """
    Monta o corpo do PUT no Keycloak só com os quatro campos de identidade,
    mesclando o que já existe no KC com o patch (evita apagar email ao mudar só o nome).
    """
    merged: dict[str, Any] = {}
    for k in _IDENTITY_KEYS:
        if k in partial:
            merged[k] = partial[k]
        elif k in existing:
            merged[k] = existing[k]
    return {k: v for k, v in merged.items() if v is not None}

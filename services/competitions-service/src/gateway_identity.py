from src.config.settings import settings


def resolve_gateway_sub(
    x_keycloak_sub: str | None,
    x_test_sub: str | None,
) -> str | None:
    kc = (x_keycloak_sub or "").strip()
    if kc:
        return kc
    if not settings.TRUST_GATEWAY and settings.ENV != "prod":
        t = (x_test_sub or "").strip()
        if t:
            return t
    return None

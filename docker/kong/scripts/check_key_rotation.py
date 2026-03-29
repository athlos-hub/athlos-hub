#!/usr/bin/env python3
"""
Compara a chave pública RSA do realm no JWKS do Keycloak com o PEM embutido em generate_config.py.

Variáveis de ambiente:
  KEYCLOAK_JWKS_URL  URL completa do JWKS (opcional; tem precedência sobre KEYCLOAK_URL)
  KEYCLOAK_URL       ex.: http://localhost:8080 — usado como {KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/certs
  REALM              default: athlos

Saída: alerta em stderr e exit 1 se o material da chave não coincidir com PEM_PUBKEY do script gerador.
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


def _load_pem_from_generate_config(script_path: Path) -> bytes:
    text = script_path.read_text(encoding="utf-8")
    m = re.search(
        r'PEM_PUBKEY\s*=\s*"""(.*?)"""',
        text,
        re.DOTALL,
    )
    if not m:
        print("Não foi possível localizar PEM_PUBKEY em generate_config.py", file=sys.stderr)
        sys.exit(1)
    pem = m.group(1).strip().encode("utf-8")
    if not pem.startswith(b"-----BEGIN"):
        print("PEM_PUBKEY inválido no generate_config.py", file=sys.stderr)
        sys.exit(1)
    return pem


def _b64url_int(s: str) -> int:
    pad = "=" * ((4 - len(s) % 4) % 4)
    return int.from_bytes(base64.urlsafe_b64decode(s + pad), "big")


def main() -> None:
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.backends import default_backend
    except ImportError:
        print("Instale cryptography: pip install cryptography", file=sys.stderr)
        sys.exit(2)

    realm = os.environ.get("REALM", "athlos")
    jwks_url = os.environ.get("KEYCLOAK_JWKS_URL")
    if not jwks_url:
        keycloak_url = os.environ.get("KEYCLOAK_URL", "http://localhost:8080").rstrip("/")
        jwks_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/certs"

    script_dir = Path(__file__).resolve().parent
    gen = script_dir.parent / "generate_config.py"
    pem_bytes = _load_pem_from_generate_config(gen)
    local_key = serialization.load_pem_public_key(pem_bytes, backend=default_backend())
    local_pub = local_key.public_numbers()

    try:
        req = urllib.request.Request(jwks_url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            jwks = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"Erro ao obter JWKS de {jwks_url}: {e}", file=sys.stderr)
        sys.exit(1)

    keys = jwks.get("keys") or []
    rsa_keys = [k for k in keys if k.get("kty") == "RSA" and "n" in k and "e" in k]
    if not rsa_keys:
        print("JWKS não contém chaves RSA utilizáveis.", file=sys.stderr)
        sys.exit(1)

    match = False
    kids = []
    for k in rsa_keys:
        kids.append(k.get("kid", "?"))
        n = _b64url_int(k["n"])
        e = _b64url_int(k["e"])
        if n == local_pub.n and e == local_pub.e:
            match = True
            break

    if match:
        print("OK: chave pública do JWKS coincide com PEM_PUBKEY em generate_config.py")
        print(f"JWKS kids vistos: {', '.join(kids)}")
        return

    print(
        "ALERTA: a chave pública RSA ativa no Keycloak (JWKS) NÃO coincide com PEM_PUBKEY "
        "em docker/kong/generate_config.py. Atualize o PEM no gerador, regenere config.yml "
        "e faça deploy do Kong; caso contrário tokens válidos do Keycloak serão rejeitados.",
        file=sys.stderr,
    )
    print(f"JWKS: {jwks_url}", file=sys.stderr)
    print(f"kids: {kids}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()

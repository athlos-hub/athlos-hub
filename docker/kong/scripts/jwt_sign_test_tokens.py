#!/usr/bin/env python3
"""Gera dois JWT RS256 para testar iss no Kong (manter iss em sync com generate_config.py)."""

from __future__ import annotations

import argparse
import base64
import json
import sys
import time
from pathlib import Path

# Deve coincidir com as chaves ``key`` dos jwt_secrets em docker/kong/generate_config.py
ISS_LOCAL = "http://localhost:8100/keycloak/realms/athlos"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _sign_rs256(header: dict, payload: dict, private_key_pem: str) -> str:
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding
    except ImportError as e:
        print("Instale cryptography: pip install cryptography", file=sys.stderr)
        raise SystemExit(2) from e

    key = serialization.load_pem_private_key(
        private_key_pem.encode("utf-8"), password=None
    )
    h = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h}.{p}".encode("ascii")
    sig = key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    s = _b64url(sig)
    return f"{h}.{p}.{s}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--key-file", required=True, help="PEM RSA private key (par do PEM_PUBKEY do generate_config.py)")
    ap.add_argument("--sub", default="kong-iss-test-sub")
    args = ap.parse_args()
    pem = Path(args.key_file).read_text(encoding="utf-8")
    now = int(time.time())
    base = {"sub": args.sub, "exp": now + 3600, "iat": now}
    wrong = _sign_rs256(
        {"alg": "RS256", "typ": "JWT"},
        {**base, "iss": "https://wrong-issuer.example/realms/athlos"},
        pem,
    )
    correct = _sign_rs256(
        {"alg": "RS256", "typ": "JWT"},
        {**base, "iss": ISS_LOCAL},
        pem,
    )
    print(wrong)
    print(correct)


if __name__ == "__main__":
    main()

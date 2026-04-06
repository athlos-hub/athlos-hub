#!/usr/bin/env python3
"""Gera docker/kong/config.yml a partir deste script e do Lua embutido.

Após alterar este ficheiro:
  python3 docker/kong/generate_config.py
  docker run --rm -e KONG_DATABASE=off -v "$(pwd)/docker/kong/config.yml:/kong.yml:ro" kong:3.9 kong config parse /kong.yml

Ferramentas opcionais (validação local / CI): ver docker/kong/README.md e docker/kong/scripts/.

JWT / iss (sem fallback automático):
  O plugin JWT do Kong escolhe a credencial (jwt_secret) cujo campo ``key`` coincide com o claim ``iss`` do token.
  Existem duas credenciais (localhost e produção) com a mesma chave pública RSA; o Kong NÃO tenta a segunda
  se a primeira falhar — o token tem de trazer exatamente o ``iss`` que o Keycloak emitiu para esse ambiente.
  Um token com ``iss`` que não corresponde a nenhuma credencial recebe 401.

JWT opcional (anonymous):
  Consumer ``anonymous`` (UUID fixo) é usado em ``config.anonymous`` do plugin JWT na rota
  GET /api/organizations/{slug}: pedidos sem Bearer passam como anónimo; com Bearer válido o post-function
  injeta X-Keycloak-Sub. Atenção: token inválido também pode cair no fluxo anónimo (comportamento do Kong).
"""

import json
import os
import pathlib
import urllib.request

import yaml

LUA = pathlib.Path(__file__).with_name("gateway-jwt-headers.lua").read_text(encoding="utf-8")

# UUID fixo referenciado por config.anonymous do JWT (consumer sem jwt_secrets).
ANONYMOUS_CONSUMER_ID = "a0000001-0000-4000-8000-000000000001"

DEFAULT_JWT_ISSUERS = [
    "http://localhost:8080/keycloak/realms/athlos",
    "http://localhost:8100/keycloak/realms/athlos",
    "https://athloshub.com.br/keycloak/realms/athlos",
]

# Fallback apenas para ambientes onde não seja possível descobrir a chave automaticamente.
FALLBACK_PEM_PUBKEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyOuM+1pTx5i8AhL+lc++
mGCsyVjNNu0eLbNGfOW4sJs2MEaPTZh6ckC/wDwd8SvQvRVkagxE1qEPzWGMHSxj
1jAhRwYAdiBPFiL68QezgB7w62/AFZYQ0EzUKX2Rx2BYihZDo2ijCIGfJCcWjmTy
NSwAlsKLmYoPF4BiJkNNajP2lLBA2KZIU513uyCVNt9qzpc9QCt9IYTh9rOEf9Tx
NfnNnxKXXDGvVHtungUvnER7aXlQ04Ob5PB12UPkkm6hwQT5vknlMFzkuURNSOGA
UMCiBhdHy24hXiPrhvVKjgwWKZYlImmAy5f9wrDFiAmfmbJ4lIgVWi5yBUlZQ3nk
qwIDAQAB
-----END PUBLIC KEY-----
"""


def _multiline_str_presenter(dumper, data: str):
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


yaml.add_representer(str, _multiline_str_presenter)


def _pem_from_keycloak_realm_public_key(raw_b64: str) -> str:
    s = "".join(raw_b64.strip().split())
    lines = [s[i : i + 64] for i in range(0, len(s), 64)]
    return "-----BEGIN PUBLIC KEY-----\n" + "\n".join(lines) + "\n-----END PUBLIC KEY-----"


def _discover_pem_pubkey(issuers: list[str]) -> str:
    env_pem = os.getenv("KONG_JWT_PEM_PUBKEY", "").strip()
    if env_pem:
        return env_pem

    for issuer in issuers:
        realm_url = issuer.rstrip("/")
        try:
            with urllib.request.urlopen(realm_url, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
            public_key = payload.get("public_key")
            if isinstance(public_key, str) and public_key.strip():
                return _pem_from_keycloak_realm_public_key(public_key)
        except Exception:
            continue

    print("WARN: unable to discover Keycloak public key; using fallback KONG key")
    return FALLBACK_PEM_PUBKEY


def _jwt_issuers() -> list[str]:
    raw = os.getenv("KONG_JWT_ISSUERS", "")
    if not raw.strip():
        return DEFAULT_JWT_ISSUERS
    return [i.strip() for i in raw.split(",") if i.strip()]


def jwt_plugins(*, anonymous_consumer_id: str | None = None) -> list:
    jwt_cfg: dict = {
        "key_claim_name": "iss",
        "claims_to_verify": ["exp"],
        "realm": "athlos",
    }
    if anonymous_consumer_id:
        jwt_cfg["anonymous"] = anonymous_consumer_id
    return [
        {"name": "jwt", "config": jwt_cfg},
        {"name": "post-function", "config": {"access": [LUA]}},
    ]


def base_service(name: str, host: str, port: int) -> dict:
    return {
        "name": name,
        "url": f"http://{host}:{port}",
        "protocol": "http",
        "host": host,
        "port": port,
    }


def main() -> None:
    host = "host.docker.internal"
    issuers = _jwt_issuers()
    pem_pubkey = _discover_pem_pubkey(issuers)

    doc: dict = {
        "_format_version": "3.0",
        "_transform": True,
        "consumers": [
            {
                "username": "anonymous",
                "id": ANONYMOUS_CONSUMER_ID,
            },
            {
                "username": "keycloak-athlos",
                "jwt_secrets": [
                    {
                        "algorithm": "RS256",
                        "key": issuer,
                        "secret": "kong-rs256-placeholder-secret",
                        "rsa_public_key": pem_pubkey,
                    }
                    for issuer in issuers
                ],
            },
        ],
        "plugins": [
            {
                "name": "cors",
                "config": {
                    "origins": [
                        "http://athloshub.com.br",
                        "http://localhost:8100",
                        "http://localhost:3000",
                    ],
                    "methods": [
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS",
                        "HEAD",
                    ],
                    "headers": [
                        "Accept",
                        "Accept-Version",
                        "Content-Length",
                        "Content-MD5",
                        "Content-Type",
                        "Date",
                        "X-Auth-Token",
                        "Authorization",
                        "X-Requested-With",
                        "X-Request-Id",
                        "X-User-Id",
                        "X-Keycloak-Sub",
                        "X-Keycloak-Roles",
                        "X-Keycloak-Email",
                        "X-Keycloak-Preferred-Username",
                        "Cache-Control",
                        "Connection",
                        "Keep-Alive",
                    ],
                    "exposed_headers": [
                        "Cache-Control",
                        "Connection",
                        "Content-Type",
                        "Date",
                        "Keep-Alive",
                        "Transfer-Encoding",
                        "X-Accel-Buffering",
                    ],
                    "credentials": True,
                    "max_age": 3600,
                },
            }
        ],
        "services": [],
    }

    services: list = []

    auth = base_service("auth-service", host, 8000)
    auth_routes: list = [
        {"name": "auth-public-auth", "protocols": ["http", "https"], "paths": ["/api/auth"], "strip_path": False},
        {"name": "auth-public-health", "protocols": ["http", "https"], "paths": ["/api/health"], "strip_path": False},
        {
            "name": "auth-internal-validate-members",
            "protocols": ["http", "https"],
            "paths": ["/api/internal/validate-members"],
            "methods": ["POST"],
            "strip_path": False,
            "regex_priority": 320,
        },
        {
            "name": "auth-internal-check-permission",
            "protocols": ["http", "https"],
            "paths": ["/api/internal/check-permission"],
            "methods": ["POST"],
            "strip_path": False,
            "regex_priority": 320,
        },
        {
            "name": "auth-internal-org-exists",
            "protocols": ["http", "https"],
            "paths": [r"~/api/internal/organizations/[^/]+/exists$"],
            "methods": ["GET"],
            "strip_path": False,
            "regex_priority": 320,
        },
        # Preview de convite de time (sem JWT) — não pode cair em auth-jwt-teams (/api/teams).
        {
            "name": "auth-public-team-invite-validate",
            "protocols": ["http", "https"],
            "paths": [r"~/api/teams/invites/[^/]+/validate$"],
            "methods": ["GET"],
            "strip_path": False,
            "regex_priority": 200,
        },
        {"name": "auth-public-users", "protocols": ["http", "https"], "paths": ["/api/users"], "strip_path": False},
        {
            "name": "auth-public-orgs-list-get",
            "protocols": ["http", "https"],
            "paths": ["/api/organizations"],
            "strip_path": False,
            "methods": ["GET"],
            "regex_priority": 0,
        },
        {
            "name": "auth-jwt-org-by-slug-get-optional",
            "protocols": ["http", "https"],
            "paths": [r"~/api/organizations/[^/]+$"],
            "strip_path": False,
            "methods": ["GET"],
            "regex_priority": 150,
            "plugins": jwt_plugins(anonymous_consumer_id=ANONYMOUS_CONSUMER_ID),
        },
    ]

    for r in [
        {"name": "auth-jwt-users-me", "paths": ["/api/users/me"], "regex_priority": 200},
        {"name": "auth-jwt-users-orgs", "paths": ["/api/users/organizations"], "regex_priority": 190},
        {"name": "auth-jwt-orgs-me", "paths": ["/api/organizations/me"], "regex_priority": 180},
        {"name": "auth-jwt-orgs-nested", "paths": [r"~/api/organizations/.+/.+"], "regex_priority": 170},
        {
            "name": "auth-jwt-org-single-mutation",
            "paths": [r"~/api/organizations/[^/]+$"],
            "methods": ["PUT", "PATCH", "DELETE"],
            "regex_priority": 160,
        },
        {
            "name": "auth-jwt-org-post-root",
            "paths": ["/api/organizations"],
            "methods": ["POST"],
            "regex_priority": 155,
        },
        {"name": "auth-jwt-admin", "paths": ["/api/admin"], "regex_priority": 140},
        {"name": "auth-jwt-teams", "paths": ["/api/teams"], "regex_priority": 130},
    ]:
        rt = {
            "name": r["name"],
            "protocols": ["http", "https"],
            "paths": r["paths"],
            "strip_path": False,
            "regex_priority": r.get("regex_priority", 0),
            "plugins": jwt_plugins(),
        }
        if "methods" in r:
            rt["methods"] = r["methods"]
        auth_routes.append(rt)

    auth["routes"] = auth_routes
    services.append(auth)

    comp = base_service("competitions-service", host, 8001)
    comp["routes"] = [
        {
            "name": "competitions-internal-teams",
            "protocols": ["http", "https"],
            "paths": ["/api/internal/teams"],
            "methods": ["POST"],
            "strip_path": False,
            "regex_priority": 330,
        },
        {"name": "competitions-health", "protocols": ["http", "https"], "paths": ["/api/health"], "strip_path": False},
        # Leitura pública (listagem/detalhe GET); mutações continuam em competitions-protected.
        {
            "name": "competitions-pub-modalities-get",
            "protocols": ["http", "https"],
            "paths": ["/api/modalities"],
            "strip_path": False,
            "regex_priority": 200,
            "methods": ["GET"],
        },
        {
            "name": "competitions-pub-competitions-get",
            "protocols": ["http", "https"],
            "paths": ["/api/competitions"],
            "strip_path": False,
            "regex_priority": 200,
            "methods": ["GET"],
        },
        # WebSocket do placar: browsers não enviam Authorization no upgrade; JWT quebraria a conexão.
        {
            "name": "competitions-pub-scoreboard-ws",
            "protocols": ["http", "https"],
            "paths": ["~/api/scoreboard/ws/[^/]+$"],
            "strip_path": False,
            "regex_priority": 400,
        },
        # GET placar por partida (leitura pública; POST /update continua em competitions-protected).
        {
            "name": "competitions-pub-scoreboard-get",
            "protocols": ["http", "https"],
            "paths": ["~/api/scoreboard/[0-9a-fA-F-]{36}$"],
            "strip_path": False,
            "regex_priority": 350,
            "methods": ["GET"],
        },
        {
            "name": "competitions-protected",
            "protocols": ["http", "https"],
            "paths": [
                "/api/competitions",
                "/api/matches",
                "/api/modalities",
                "/api/scoreboard",
                "/api/sport-teams",
                "/api/rankings",
                "/api/stats-rulesets",
                "/api/sport-rulesets",
            ],
            "strip_path": False,
            "plugins": jwt_plugins(),
        },
    ]
    services.append(comp)

    ls = base_service("live-service", host, 8004)
    ls["routes"] = [
        {"name": "livestream-webhooks", "paths": ["/api/webhooks"], "protocols": ["http", "https"], "strip_path": False},
        {
            "name": "livestream-socket",
            "paths": ["/socket.io"],
            "protocols": ["http", "https"],
            "strip_path": False,
            "preserve_host": True,
        },
        {
            "name": "livestream-jwt",
            "paths": ["/api/lives", "/api/google-calendar"],
            "protocols": ["http", "https"],
            "strip_path": False,
            "plugins": jwt_plugins(),
        },
    ]
    services.append(ls)

    notif = base_service("notifications-service", host, 8003)
    notif["routes"] = [
        {
            "name": "notifications-internal-create",
            "protocols": ["http", "https"],
            "paths": ["/api/notifications/internal"],
            "strip_path": False,
            "methods": ["POST"],
            "regex_priority": 300,
            "request_buffering": False,
            "response_buffering": False,
        },
        {
            "name": "notifications-user-api",
            "protocols": ["http", "https"],
            "paths": ["/api/notifications"],
            "strip_path": False,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
            "regex_priority": 0,
            "request_buffering": False,
            "response_buffering": False,
            "plugins": jwt_plugins(),
        },
    ]
    services.append(notif)

    # Serviço dedicado ao SSE: read_timeout/write_timeout por serviço (Kong 3.x); não há override
    # global no docker-compose. upstream_keepalive / keepalive_timeout do Nginx do Kong são defaults
    # da imagem — o que mata conexão longa sem tráfego é sobretudo read_timeout até o upstream.
    notif_sse = base_service("notifications-sse-service", host, 8003)
    notif_sse["read_timeout"] = 3_600_000
    notif_sse["write_timeout"] = 3_600_000
    notif_sse["routes"] = [
        {
            "name": "notifications-sse-stream",
            "protocols": ["http", "https"],
            "paths": ["/api/notifications/unread-count/stream"],
            "strip_path": False,
            "preserve_host": True,
            "regex_priority": 400,
            "request_buffering": False,
            "response_buffering": False,
            "plugins": jwt_plugins(),
        },
    ]
    services.append(notif_sse)

    soc = base_service("social-service", host, 8083)
    soc_routes: list = []

    # Aninhados em /api/social/posts/:id/... não podem cair nas rotas públicas por prefixo
    # (/api/social/posts + GET/POST), senão o JWT não corre e o Kong não injeta X-Keycloak-Sub
    # (401 em like/comentar; 404 em listar comentários de post seguidores/membros).
    soc_routes.extend(
        [
            {
                "name": "social-jwt-post-by-id-get-optional",
                "protocols": ["http", "https"],
                "paths": [r"~/api/social/posts/[^/]+$"],
                "strip_path": False,
                "regex_priority": 125,
                "methods": ["GET"],
                "plugins": jwt_plugins(anonymous_consumer_id=ANONYMOUS_CONSUMER_ID),
            },
            {
                "name": "social-jwt-post-comments-get-optional",
                "protocols": ["http", "https"],
                "paths": [r"~/api/social/posts/[^/]+/comments$"],
                "strip_path": False,
                "regex_priority": 125,
                "methods": ["GET"],
                "plugins": jwt_plugins(anonymous_consumer_id=ANONYMOUS_CONSUMER_ID),
            },
            {
                "name": "social-jwt-post-comments-post",
                "protocols": ["http", "https"],
                "paths": [r"~/api/social/posts/[^/]+/comments$"],
                "strip_path": False,
                "regex_priority": 125,
                "methods": ["POST"],
                "plugins": jwt_plugins(),
            },
            {
                "name": "social-jwt-post-comment-mutation",
                "protocols": ["http", "https"],
                "paths": [r"~/api/social/posts/[^/]+/comments/[^/]+$"],
                "strip_path": False,
                "regex_priority": 125,
                "methods": ["PUT", "DELETE"],
                "plugins": jwt_plugins(),
            },
            {
                "name": "social-jwt-post-like-get-optional",
                "protocols": ["http", "https"],
                "paths": [r"~/api/social/posts/[^/]+/like$"],
                "strip_path": False,
                "regex_priority": 125,
                "methods": ["GET"],
                "plugins": jwt_plugins(anonymous_consumer_id=ANONYMOUS_CONSUMER_ID),
            },
            {
                "name": "social-jwt-post-like-post",
                "protocols": ["http", "https"],
                "paths": [r"~/api/social/posts/[^/]+/like$"],
                "strip_path": False,
                "regex_priority": 125,
                "methods": ["POST"],
                "plugins": jwt_plugins(),
            },
            {
                "name": "social-jwt-org-wall-posts-get-optional",
                "protocols": ["http", "https"],
                "paths": [r"~/api/social/organizations/[^/]+/posts$"],
                "strip_path": False,
                "regex_priority": 125,
                "methods": ["GET"],
                "plugins": jwt_plugins(anonymous_consumer_id=ANONYMOUS_CONSUMER_ID),
            },
            {
                "name": "social-jwt-team-wall-posts-get-optional",
                "protocols": ["http", "https"],
                "paths": [r"~/api/social/teams/[^/]+/posts$"],
                "strip_path": False,
                "regex_priority": 125,
                "methods": ["GET"],
                "plugins": jwt_plugins(anonymous_consumer_id=ANONYMOUS_CONSUMER_ID),
            },
        ]
    )

    public_specs = [
        ("/api/social/health", None, 120),
        ("/api/social/info", None, 120),
        ("/api/social/auth/public", None, 120),
        ("/api/social/feed/public", None, 120),
        ("/api/social/search", ["GET"], 115),
        ("/api/social/organization-profiles", ["GET"], 115),
        ("/api/social/team-follow/count", ["GET"], 115),
        ("/api/social/profile", ["GET"], 115),
        ("/api/social/athlete/posts", ["GET"], 115),
        ("/api/social/shares/user", ["GET"], 115),
        ("/api/social/shares/count", ["GET"], 115),
        ("/api/social/teams", ["GET"], 115),
        ("/api/social/team-profiles", ["GET"], 115),
        ("/api/social/team-profiles", ["POST"], 114),
        ("/api/social/achievements/notify", ["POST"], 114),
        ("/api/social/posts", ["GET"], 113),
        ("/api/social/posts", ["POST", "PUT", "PATCH", "DELETE"], 112),
    ]
    seen: set = set()
    for path, methods, rp in public_specs:
        key = (path, tuple(methods) if methods else None, rp)
        if key in seen:
            continue
        seen.add(key)
        mslug = "-".join(methods) if methods else "any"
        name = ("social-pub-" + path.replace("/", "-") + "-" + mslug)[:120]
        d = {
            "name": name,
            "protocols": ["http", "https"],
            "paths": [path],
            "strip_path": False,
            "regex_priority": rp,
        }
        if methods:
            d["methods"] = methods
        soc_routes.append(d)

    soc_routes.append(
        {
            "name": "social-jwt-catchall",
            "protocols": ["http", "https"],
            "paths": ["/api/social"],
            "strip_path": False,
            "regex_priority": 0,
            "plugins": jwt_plugins(),
        }
    )
    soc["routes"] = soc_routes
    services.append(soc)

    services.extend(
        [
            {
                "name": "mediamtx-hls",
                "url": f"http://{host}:8888",
                "protocol": "http",
                "host": host,
                "port": 8888,
                "routes": [
                    {
                        "name": "hls-stream",
                        "paths": ["/live"],
                        "protocols": ["http", "https"],
                        "strip_path": False,
                        "preserve_host": True,
                    }
                ],
            },
            {
                "name": "keycloak-service",
                "url": f"http://{host}:8080",
                "protocol": "http",
                "host": host,
                "port": 8080,
                "routes": [
                    {
                        "name": "keycloak-routes",
                        "protocols": ["http", "https"],
                        "paths": ["/keycloak"],
                        "strip_path": False,
                        "preserve_host": True,
                    }
                ],
            },
            {
                "name": "frontend-service",
                "url": f"http://{host}:3000",
                "protocol": "http",
                "host": host,
                "port": 3000,
                "routes": [
                    {
                        "name": "frontend-routes",
                        "protocols": ["http", "https"],
                        "paths": ["/"],
                        "strip_path": False,
                        "preserve_host": True,
                    }
                ],
            },
        ]
    )

    doc["services"] = services

    out = pathlib.Path(__file__).with_name("config.yml")
    generated_notice = (
        "# Generated by docker/kong/generate_config.py — do not edit by hand.\n"
        "# Regenerate: python3 docker/kong/generate_config.py\n\n"
    )
    out.write_text(
        generated_notice + yaml.dump(doc, sort_keys=False, allow_unicode=True, width=120),
        encoding="utf-8",
    )
    print("Wrote", out)


if __name__ == "__main__":
    main()

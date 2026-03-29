#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE="${ATHLOS_KONG_JWT_TEST_PRIVATE_KEY_FILE:-}"
KONG_URL="${KONG_URL:-http://localhost:8000}"
ROUTE="${KONG_TEST_JWT_ROUTE:-/api/users/me}"

if [[ -z "$KEY_FILE" || ! -f "$KEY_FILE" ]]; then
  echo "Defina ATHLOS_KONG_JWT_TEST_PRIVATE_KEY_FILE com o caminho ao PEM da chave privada RSA" >&2
  echo "(deve ser o par da chave pública PEM_PUBKEY em docker/kong/generate_config.py)." >&2
  exit 2
fi

mapfile -t TOKENS < <(python3 "$DIR/jwt_sign_test_tokens.py" --key-file "$KEY_FILE")
WRONG="${TOKENS[0]}"
RIGHT="${TOKENS[1]}"

code_wrong=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${WRONG}" "${KONG_URL}${ROUTE}" || true)
code_right=$(curl -sS -D /tmp/kong_right_headers.txt -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${RIGHT}" "${KONG_URL}${ROUTE}" || true)

echo "iss errado → HTTP ${code_wrong} (esperado 401)"
echo "iss local  → HTTP ${code_right} (esperado != 401 do Kong)"

if [[ "$code_wrong" != "401" ]]; then
  echo "Falha: token com iss não configurado deveria receber 401 do Kong." >&2
  exit 1
fi

if [[ "$code_right" == "401" ]] && grep -qi "WWW-Authenticate" /tmp/kong_right_headers.txt 2>/dev/null; then
  echo "Falha: token com iss válido foi rejeitado pelo Kong." >&2
  cat /tmp/kong_right_headers.txt >&2
  exit 1
fi

echo "OK: iss errado bloqueado pelo Kong; iss válido passou (upstream retornou ${code_right})."

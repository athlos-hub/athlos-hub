#!/bin/sh
# Chamado pelo MediaMTX em runOnNotReady quando o fluxo deixa de estar disponível
# (ex.: publisher desconectou). Base URL configurável para dev (host) vs prod (Docker network).
set -eu
BASE="${MEDIAMTX_WEBHOOK_BASE:-http://live-service:8004}"
curl -sfS -X POST "${BASE}/api/webhooks/on-publish-done" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"${MTX_PATH}\",\"protocol\":\"${MTX_PROTOCOL:-}\"}"

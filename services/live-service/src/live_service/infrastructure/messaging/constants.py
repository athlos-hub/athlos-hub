"""Contrato alinhado a docker/messaging/contract.py."""

from aio_pika import ExchangeType

EXCHANGE_LIVE = "athlos.live"
EXCHANGE_TYPE = ExchangeType.TOPIC

RK_LIVE_MATCH_REQUESTED = "match.live.requested"

QUEUE_LIVE_MATCH_CREATE = "live.match_live_create"

DLX_EXCHANGE = "athlos.dlx"
DLX_FAILED_ROUTING_KEY = "failed.live"
QUEUE_LIVE_FAILED = "live.failed"

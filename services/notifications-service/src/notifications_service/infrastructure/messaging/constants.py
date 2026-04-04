"""Contrato alinhado a docker/messaging/contract.py."""

from aio_pika import ExchangeType

EXCHANGE_NOTIFICATIONS = "athlos.notifications"
EXCHANGE_TYPE = ExchangeType.TOPIC

RK_NOTIFICATION_CREATED = "notification.created"

QUEUE_NOTIFICATIONS = "notifications.notification_created"

DLX_EXCHANGE = "athlos.dlx"
DLX_FAILED_ROUTING_KEY = "failed.notifications"
QUEUE_NOTIFICATIONS_FAILED = "notifications.failed"

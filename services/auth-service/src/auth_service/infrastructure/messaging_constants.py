"""Contrato alinhado a docker/messaging/contract.py (produtores auth-service)."""

EXCHANGE_NOTIFICATIONS = "athlos.notifications"
EXCHANGE_COMPETITIONS = "athlos.competitions"
EXCHANGE_SOCIAL = "athlos.social"
EXCHANGE_OUTBOUND_EMAIL = "athlos.outbound.email"

DLX_EXCHANGE = "athlos.dlx"
DLX_RK_EMAIL_FAILED = "failed.email"
QUEUE_AUTH_MAIL = "auth.mail_send"
QUEUE_EMAIL_FAILED = "email.failed"

RK_NOTIFICATION_CREATED = "notification.created"
RK_PROFILE_ATHLETE_ENSURE = "profile.athlete.ensure"
RK_PROFILE_ORGANIZATION_ENSURE = "profile.organization.ensure"
RK_TEAMS_IMPORT_REQUESTED = "teams.import.requested"
RK_TEAMS_LOGO_SYNC = "teams.logo.sync"
RK_MAIL_SEND = "mail.send"

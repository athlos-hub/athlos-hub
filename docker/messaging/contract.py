"""
Contrato de mensageria Athlos (RabbitMQ).

Exchanges (topic, duráveis):
- athlos.notifications — notificações in-app
- athlos.live — criação de live por partida
- athlos.competitions — importação de time (RPC), sync de logo do escudo
- athlos.social — conquistas notificadas pelo competitions-service
- athlos.outbound.email — envio SMTP (auth-service consumidor)

Dead-letter: athlos.dlx (direct).

Routing keys (resumo):
- notification.created, match.live.requested, teams.import.requested, teams.logo.sync
- achievement.notify, mail.send
"""

# Exchanges
EXCHANGE_NOTIFICATIONS = "athlos.notifications"
EXCHANGE_LIVE = "athlos.live"
EXCHANGE_COMPETITIONS = "athlos.competitions"
EXCHANGE_SOCIAL = "athlos.social"
EXCHANGE_OUTBOUND_EMAIL = "athlos.outbound.email"
EXCHANGE_TYPE_TOPIC = "topic"

RK_NOTIFICATION_CREATED = "notification.created"
RK_LIVE_MATCH_REQUESTED = "match.live.requested"
RK_TEAMS_IMPORT_REQUESTED = "teams.import.requested"
RK_TEAMS_LOGO_SYNC = "teams.logo.sync"
RK_ACHIEVEMENT_NOTIFY = "achievement.notify"
RK_MAIL_SEND = "mail.send"

QUEUE_NOTIFICATIONS = "notifications.notification_created"
QUEUE_LIVE_MATCH_CREATE = "live.match_live_create"
QUEUE_COMPETITIONS_TEAMS_IMPORT = "competitions.teams_import_rpc"
QUEUE_COMPETITIONS_LOGO_SYNC = "competitions.team_logo_sync"
QUEUE_SOCIAL_ACHIEVEMENTS = "social.achievements"
QUEUE_AUTH_MAIL = "auth.mail_send"
QUEUE_EMAIL_FAILED = "email.failed"

DLX_EXCHANGE = "athlos.dlx"
DLX_RK_EMAIL_FAILED = "failed.email"

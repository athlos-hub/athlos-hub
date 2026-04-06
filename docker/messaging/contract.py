"""
Contrato de mensageria Athlos (RabbitMQ).

Exchanges (topic, duráveis):
- athlos.notifications — notificações in-app
- athlos.live — criação de live por partida
- athlos.competitions — importação de time (RPC), sync de logo do escudo
- athlos.social — conquistas, provisionamento de perfis (atleta/org/time)
- athlos.outbound.email — envio SMTP (auth-service consumidor)

Dead-letter: athlos.dlx (direct).

Routing keys (resumo):
- notification.created, match.live.requested, match.live.finished, teams.import.requested, teams.mirror.delete.requested, teams.logo.sync
- achievement.notify
- profile.athlete.ensure, profile.organization.ensure, profile.team.ensure, profile.team.delete
- mail.send

Payloads (JSON) para athlos.social / perfis:
- profile.athlete.ensure: {"keycloak_id": "<uuid>"}
- profile.organization.ensure: {"organization_slug": "...", "approved_for_social": true|false}
- profile.team.ensure: {"team_id": "<uuid-str>", "organization_slug": "...", "approved_for_social": true|false}
- profile.team.delete: {"team_id": "<uuid-str>"}  (ID do time no competitions-service)

Payload (JSON) athlos.competitions — RPC com reply_to (igual teams.import):
- teams.mirror.delete.requested: {"auth_team_id": "<uuid>", "competition_team_id": "<uuid opcional>"}
  Resposta: {"ok": true} ou {"ok": false, "detail": "..."}
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
RK_MATCH_LIVE_FINISHED = "match.live.finished"
RK_TEAMS_IMPORT_REQUESTED = "teams.import.requested"
RK_TEAMS_MIRROR_DELETE_REQUESTED = "teams.mirror.delete.requested"
RK_TEAMS_LOGO_SYNC = "teams.logo.sync"
RK_ACHIEVEMENT_NOTIFY = "achievement.notify"
RK_PROFILE_ATHLETE_ENSURE = "profile.athlete.ensure"
RK_PROFILE_ORGANIZATION_ENSURE = "profile.organization.ensure"
RK_PROFILE_TEAM_ENSURE = "profile.team.ensure"
RK_PROFILE_TEAM_DELETE = "profile.team.delete"
RK_MAIL_SEND = "mail.send"

QUEUE_NOTIFICATIONS = "notifications.notification_created"
QUEUE_LIVE_MATCH_CREATE = "live.match_live_create"
QUEUE_COMPETITIONS_MATCH_LIVE_FINISHED = "competitions.match_live_finished"
QUEUE_COMPETITIONS_TEAMS_IMPORT = "competitions.teams_import_rpc"
QUEUE_COMPETITIONS_MIRROR_DELETE = "competitions.teams_mirror_delete_rpc"
QUEUE_COMPETITIONS_LOGO_SYNC = "competitions.team_logo_sync"
QUEUE_SOCIAL_ACHIEVEMENTS = "social.achievements"
QUEUE_SOCIAL_PROFILES = "social.profiles"
QUEUE_AUTH_MAIL = "auth.mail_send"
QUEUE_EMAIL_FAILED = "email.failed"

DLX_EXCHANGE = "athlos.dlx"
DLX_RK_EMAIL_FAILED = "failed.email"
DLX_RK_SOCIAL_FAILED = "failed.social"
DLX_RK_LIVE_FAILED = "failed.live"
DLX_RK_COMPETITIONS_FAILED = "failed.competitions"
QUEUE_LIVE_FAILED = "live.failed"
QUEUE_COMPETITIONS_FAILED = "competitions.failed"
QUEUE_SOCIAL_FAILED = "social.failed"

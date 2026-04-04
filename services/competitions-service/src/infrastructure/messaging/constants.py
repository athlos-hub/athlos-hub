"""Contrato alinhado a docker/messaging/contract.py."""

from aio_pika import ExchangeType

EXCHANGE_LIVE = "athlos.live"
EXCHANGE_COMPETITIONS = "athlos.competitions"
EXCHANGE_SOCIAL = "athlos.social"
EXCHANGE_TYPE = ExchangeType.TOPIC

RK_LIVE_MATCH_REQUESTED = "match.live.requested"
RK_TEAMS_IMPORT_REQUESTED = "teams.import.requested"
RK_TEAMS_LOGO_SYNC = "teams.logo.sync"
RK_ACHIEVEMENT_NOTIFY = "achievement.notify"

QUEUE_TEAMS_IMPORT = "competitions.teams_import_rpc"
QUEUE_LOGO_SYNC = "competitions.team_logo_sync"

DLX_EXCHANGE = "athlos.dlx"
DLX_RK_LIVE_FAILED = "failed.live"
DLX_RK_COMPETITIONS_FAILED = "failed.competitions"
DLX_RK_SOCIAL_FAILED = "failed.social"
QUEUE_LIVE_FAILED = "live.failed"
QUEUE_COMPETITIONS_FAILED = "competitions.failed"
QUEUE_SOCIAL_FAILED = "social.failed"

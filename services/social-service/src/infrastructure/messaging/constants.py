from aio_pika import ExchangeType

EXCHANGE_SOCIAL = "athlos.social"
EXCHANGE_TYPE = ExchangeType.TOPIC
RK_ACHIEVEMENT_NOTIFY = "achievement.notify"
RK_PROFILE_ATHLETE_ENSURE = "profile.athlete.ensure"
RK_PROFILE_ORGANIZATION_ENSURE = "profile.organization.ensure"
RK_PROFILE_TEAM_ENSURE = "profile.team.ensure"
QUEUE_SOCIAL_ACHIEVEMENTS = "social.achievements"
QUEUE_SOCIAL_PROFILES = "social.profiles"
DLX_EXCHANGE = "athlos.dlx"
DLX_RK_SOCIAL_FAILED = "failed.social"
QUEUE_SOCIAL_FAILED = "social.failed"

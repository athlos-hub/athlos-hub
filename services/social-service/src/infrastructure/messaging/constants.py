from aio_pika import ExchangeType

EXCHANGE_SOCIAL = "athlos.social"
EXCHANGE_TYPE = ExchangeType.TOPIC
RK_ACHIEVEMENT_NOTIFY = "achievement.notify"
QUEUE_SOCIAL_ACHIEVEMENTS = "social.achievements"
DLX_EXCHANGE = "athlos.dlx"
DLX_RK_SOCIAL_FAILED = "failed.social"
QUEUE_SOCIAL_FAILED = "social.failed"

"""Enums alinhados ao domínio (ex-Prisma / NestJS)."""

from enum import Enum


class LiveStatus(str, Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINISHED = "finished"
    CANCELLED = "cancelled"


class MatchEventType(str, Enum):
    SCORE = "SCORE"
    PERIOD_START = "PERIOD_START"
    PERIOD_END = "PERIOD_END"
    TIMEOUT = "TIMEOUT"
    SUBSTITUTION = "SUBSTITUTION"
    FOUL = "FOUL"
    WARNING = "WARNING"
    EJECTION = "EJECTION"
    REVIEW = "REVIEW"
    INJURY = "INJURY"
    CUSTOM = "CUSTOM"

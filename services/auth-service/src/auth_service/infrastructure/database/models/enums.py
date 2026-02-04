import enum


class MemberStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    BANNED = "BANNED"


class OrganizationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"
    EXCLUDED = "EXCLUDED"


class OrganizationPrivacy(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class OrganizationJoinPolicy(str, enum.Enum):
    INVITE_ONLY = "INVITE_ONLY"
    REQUEST_ONLY = "REQUEST_ONLY"
    LINK_ONLY = "LINK_ONLY"
    INVITE_AND_REQUEST = "INVITE_AND_REQUEST"
    INVITE_AND_LINK = "INVITE_AND_LINK"
    REQUEST_AND_LINK = "REQUEST_AND_LINK"
    ALL = "ALL"


class TeamStatus(str, enum.Enum):
    """Status do time no auth-service."""
    PENDING = "PENDING"          # Recém criado
    RECRUITING = "RECRUITING"    # Aceitando membros
    READY = "READY"              # Atingiu mínimo, pode ser aprovado
    APPROVED = "APPROVED"        # Aprovado e enviado para competitions
    REJECTED = "REJECTED"        # Rejeitado


class TeamInviteStatus(str, enum.Enum):
    """Status do convite de time."""
    PENDING = "PENDING"      # Convite ativo, aguardando aceitação
    ACCEPTED = "ACCEPTED"    # Convite aceito
    EXPIRED = "EXPIRED"      # Convite expirado
    REVOKED = "REVOKED"      # Convite cancelado pelo capitão

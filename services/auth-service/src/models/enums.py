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
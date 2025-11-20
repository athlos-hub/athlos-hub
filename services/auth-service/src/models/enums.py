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

class OrganizationPrivacy(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
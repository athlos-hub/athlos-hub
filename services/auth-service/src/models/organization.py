from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from models.base import Base


class OrganizationType(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class OrganizationVisibility(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(
        Enum(OrganizationType, name="organization_type"),
        nullable=False,
        default=OrganizationType.PUBLIC,
    )
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    active = Column(Boolean, default=True, nullable=False)
    logo_url = Column(String(500), nullable=True)
    visibility = Column(
        Enum(OrganizationVisibility, name="visibility_organization"),
        nullable=False,
        default=OrganizationVisibility.PUBLIC,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_organizations")
    organizers = relationship(
        "OrganizationOrganizer", back_populates="organization", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name}, owner_id={self.owner_id})>"


class OrganizationOrganizer(Base):
    __tablename__ = "organization_organizers"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_organization_organizers"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="organizers")
    user = relationship("User", foreign_keys=[user_id], back_populates="organizer_in_organizations")

    def __repr__(self):
        return f"<OrganizationOrganizer(organization_id={self.organization_id}, user_id={self.user_id})>"

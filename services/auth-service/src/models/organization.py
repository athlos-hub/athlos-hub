from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .base import Base
from .enums import MemberStatus, OrganizationStatus, OrganizationPrivacy, OrganizationJoinPolicy


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    privacy = Column(
        Enum(OrganizationPrivacy, name="org_privacy"),
        nullable=False,
        default=OrganizationPrivacy.PUBLIC,
    )
    join_policy = Column(
        Enum(OrganizationJoinPolicy, name="org_join_policy"),
        nullable=True,
        default=OrganizationJoinPolicy.REQUEST_ONLY,
    )
    status = Column(
        Enum(OrganizationStatus, name="org_status"),
        nullable=False,
        default=OrganizationStatus.PENDING,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    owner = relationship("User", back_populates="owned_organizations")
    members = relationship(
        "OrganizationMember",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    organizers = relationship(
        "OrganizationOrganizer",
        back_populates="organization",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Organization(slug={self.slug}, status={self.status})>"


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_members"),
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
    status = Column(
        Enum(MemberStatus, name="member_status"),
        nullable=False,
        default=MemberStatus.PENDING,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="memberships")


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
    user = relationship("User", back_populates="organizer_roles")

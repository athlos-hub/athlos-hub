from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    keycloak_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(255), nullable=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    owned_organizations = relationship(
        "Organization",
        foreign_keys="Organization.owner_id",
        back_populates="owner",
        lazy="dynamic",
    )
    organizer_in_organizations = relationship(
        "OrganizationOrganizer",
        foreign_keys="OrganizationOrganizer.user_id",
        back_populates="user",
        lazy="dynamic",
    )

    def __repr__(self):
        return f"<User(id={self.id}, keycloak_id={self.keycloak_id}, email={self.email})>"
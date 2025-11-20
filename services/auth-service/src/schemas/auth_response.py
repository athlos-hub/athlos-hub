from pydantic import BaseModel, EmailStr, Field
from pydantic import ConfigDict
from typing import Optional, List
from datetime import datetime


class UserPublic(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, extra="ignore")

    id: str
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(default=None, alias='firstName')
    last_name: Optional[str] = Field(default=None, alias='lastName')
    enabled: bool = True
    email_verified: bool = Field(default=False, alias='emailVerified')
    created_timestamp: Optional[datetime] = Field(default=None, alias='createdTimestamp')
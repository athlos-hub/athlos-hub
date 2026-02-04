"""Schemas para endpoints internos (service-to-service)."""

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserValidationResult(BaseModel):
    """Resultado da validação de um usuário individual."""
    
    keycloak_id: UUID
    exists: bool = Field(description="Se o usuário existe no sistema")
    is_member: bool = Field(description="Se o usuário é membro ativo da organização")
    username: Optional[str] = Field(default=None, description="Username do usuário se existir")
    error: Optional[str] = Field(default=None, description="Mensagem de erro se aplicável")

    model_config = ConfigDict(from_attributes=True)


class ValidateMembersRequest(BaseModel):
    """Request para validar múltiplos membros de uma organização."""
    
    organization_slug: str = Field(..., description="Slug da organização")
    keycloak_ids: List[UUID] = Field(..., min_length=1, description="Lista de Keycloak IDs dos usuários a validar")


class ValidateMembersResponse(BaseModel):
    """Response da validação de membros."""
    
    organization_slug: str
    organization_exists: bool = Field(description="Se a organização existe")
    all_valid: bool = Field(description="Se todos os usuários são válidos e membros")
    valid_count: int = Field(description="Quantidade de usuários válidos")
    invalid_count: int = Field(description="Quantidade de usuários inválidos")
    results: List[UserValidationResult] = Field(description="Resultado detalhado por usuário")
    
    @property
    def invalid_users(self) -> List[UserValidationResult]:
        """Retorna apenas os usuários inválidos."""
        return [r for r in self.results if not r.is_member]


class CheckPermissionRequest(BaseModel):
    """Request para verificar permissão de usuário em organização."""
    
    keycloak_id: UUID = Field(..., description="Keycloak ID do usuário")
    organization_slug: str = Field(..., description="Slug da organização")
    allowed_roles: List[str] = Field(
        default=["OWNER", "ORGANIZER"],
        description="Roles que têm permissão (OWNER, ORGANIZER, MEMBER)"
    )


class CheckPermissionResponse(BaseModel):
    """Response da verificação de permissão."""
    
    has_permission: bool = Field(description="Se o usuário tem a permissão requerida")
    keycloak_id: UUID = Field(description="Keycloak ID do usuário verificado")
    organization_slug: str = Field(description="Slug da organização")
    role: Optional[str] = Field(default=None, description="Role do usuário na organização (OWNER, ORGANIZER, MEMBER, NONE)")
    organization_exists: bool = Field(default=True, description="Se a organização existe")
    user_exists: bool = Field(default=True, description="Se o usuário existe")
    error: Optional[str] = Field(default=None, description="Mensagem de erro se aplicável")

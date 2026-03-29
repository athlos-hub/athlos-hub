"""Dependências da API para injeção de dependência.

JWT validation is handled exclusively by Kong Gateway.
This service trusts X-Keycloak-Sub injected by Kong.
Do NOT add JWT validation here — it breaks the single-responsibility contract.
"""

from typing import Annotated

from auth_service.common.gateway_identity import resolve_gateway_sub
from auth_service.infrastructure.database.dependencies import get_session
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from auth_service.core.adapters.keycloak_admin_adapter import KeycloakAdminAdapter
from auth_service.core.ports.keycloak_service import IKeycloakService
from auth_service.infrastructure.database.models.user_model import User
from auth_service.repositories.organization_member_repository import (
    OrganizationMemberRepository,
    OrganizationMemberRepositoryContract,
)
from auth_service.repositories.organization_organizer_repository import (
    OrganizationOrganizerRepository,
    OrganizationOrganizerRepositoryContract,
)
from auth_service.repositories.organization_repository import (
    OrganizationRepository,
    OrganizationRepositoryContract,
)
from auth_service.repositories.user_repository import UserRepository, UserRepositoryContract
from auth_service.services.authentication_service import AuthenticationService
from auth_service.services.organization_service import OrganizationService
from auth_service.services.user_service import UserService


class OrgRole:
    """Constantes de função de organização."""

    OWNER = "OWNER"
    ORGANIZER = "ORGANIZER"
    MEMBER = "MEMBER"
    NONE = "NONE"


def get_user_repository(
    session: AsyncSession = Depends(get_session),
) -> UserRepositoryContract:
    """Factory para UserRepository."""

    return UserRepository(session)


def get_organization_repository(
    session: AsyncSession = Depends(get_session),
) -> OrganizationRepositoryContract:
    """Factory para OrganizationRepository."""

    return OrganizationRepository(session)


def get_organization_member_repository(
    session: AsyncSession = Depends(get_session),
) -> OrganizationMemberRepositoryContract:
    """Factory para OrganizationMemberRepository."""

    return OrganizationMemberRepository(session)


def get_organization_organizer_repository(
    session: AsyncSession = Depends(get_session),
) -> OrganizationOrganizerRepositoryContract:
    """Factory para OrganizationOrganizerRepository."""

    return OrganizationOrganizerRepository(session)


def get_keycloak_service() -> IKeycloakService:
    """Factory para adapter de Keycloak."""

    return KeycloakAdminAdapter()


def get_user_service(
    user_repo: UserRepositoryContract = Depends(get_user_repository),
    keycloak_service: IKeycloakService = Depends(get_keycloak_service),
) -> UserService:
    """Factory para UserService."""

    return UserService(user_repo, keycloak_service)


def get_organization_service(
    org_repo: OrganizationRepositoryContract = Depends(get_organization_repository),
    member_repo: OrganizationMemberRepositoryContract = Depends(
        get_organization_member_repository
    ),
    organizer_repo: OrganizationOrganizerRepositoryContract = Depends(
        get_organization_organizer_repository
    ),
    user_repo: UserRepositoryContract = Depends(get_user_repository),
) -> OrganizationService:
    """Factory para OrganizationService."""

    return OrganizationService(org_repo, member_repo, organizer_repo, user_repo)


def get_authentication_service(
    user_repo: UserRepositoryContract = Depends(get_user_repository),
) -> AuthenticationService:
    """Factory para AuthenticationService."""

    return AuthenticationService(user_repo)


async def get_current_db_user(
    user_repo: UserRepositoryContract = Depends(get_user_repository),
    x_keycloak_sub: Annotated[str | None, Header(alias="X-Keycloak-Sub")] = None,
    x_test_sub: Annotated[str | None, Header(alias="X-Test-Sub")] = None,
) -> User:
    """Usuário autenticado: identidade vem do Kong (JWT validado no gateway)."""

    sub = resolve_gateway_sub(x_keycloak_sub, x_test_sub)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado (cabeçalho X-Keycloak-Sub ausente).",
        )
    user = await user_repo.get_by_keycloak_id(sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado para o subject informado.",
        )
    return user


async def get_current_user_optional(
    user_repo: UserRepositoryContract = Depends(get_user_repository),
    x_keycloak_sub: Annotated[str | None, Header(alias="X-Keycloak-Sub")] = None,
    x_test_sub: Annotated[str | None, Header(alias="X-Test-Sub")] = None,
) -> User | None:
    """Usuário opcional quando o Kong propaga X-Keycloak-Sub (rotas sem JWT no gateway = anônimo)."""

    sub = resolve_gateway_sub(x_keycloak_sub, x_test_sub)
    if not sub:
        return None
    return await user_repo.get_by_keycloak_id(sub)


UserRepositoryDep = Annotated[UserRepositoryContract, Depends(get_user_repository)]
OrganizationRepositoryDep = Annotated[
    OrganizationRepositoryContract, Depends(get_organization_repository)
]
MemberRepositoryDep = Annotated[
    OrganizationMemberRepositoryContract, Depends(get_organization_member_repository)
]
OrganizerRepositoryDep = Annotated[
    OrganizationOrganizerRepositoryContract, Depends(get_organization_organizer_repository)
]

UserServiceDep = Annotated[UserService, Depends(get_user_service)]
OrganizationServiceDep = Annotated[
    OrganizationService, Depends(get_organization_service)
]
AuthenticationServiceDep = Annotated[
    AuthenticationService, Depends(get_authentication_service)
]
CurrentUserDep = Annotated[User, Depends(get_current_db_user)]
CurrentUserOptionalDep = Annotated[User | None, Depends(get_current_user_optional)]

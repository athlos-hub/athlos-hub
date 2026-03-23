"""Dependências da API para injeção de dependência"""

from typing import Annotated

from common.security.jwt_handler import JwtHandler
from database.dependencies import get_session
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.core.config import settings
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

bearer_scheme = HTTPBearer()


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
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    auth_service: AuthenticationService = Depends(get_authentication_service),
) -> User:
    """Obtém usuário autenticado atual do token JWT."""

    public_key = await AuthenticationService.get_public_key()

    payload = JwtHandler.decode_token(
        token=credentials.credentials,
        public_key=public_key,
        audience=settings.KEYCLOAK_CLIENT_ID,
        issuer=f"{settings.KEYCLOAK_ISSUER.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}",
        verify_aud=False
    )

    db_user = await auth_service.get_or_create_user_from_keycloak_token(payload)
    return db_user


async def get_current_user_optional(
    request: Request,
    auth_service: AuthenticationService = Depends(get_authentication_service),
) -> User | None:
    """Obtém usuário atual se autenticado, None caso contrário."""

    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    try:
        token = auth_header.split(" ")[1]
        public_key = await AuthenticationService.get_public_key()

        payload = JwtHandler.decode_token(
            token=token,
            public_key=public_key,
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=f"{settings.KEYCLOAK_ISSUER.rstrip('/')}/realms/{settings.KEYCLOAK_REALM}",
            verify_aud=False
        )

        user = await auth_service.get_or_create_user_from_keycloak_token(payload)
        return user
    except Exception:
        return None


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

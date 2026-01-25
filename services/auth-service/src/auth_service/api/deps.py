"""Dependências da API para injeção de dependência"""

from typing import Annotated

from common.security.jwt_handler import JwtHandler
from database.dependencies import get_session
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.core.config import settings
from auth_service.domain.interfaces.external_services import IKeycloakService
from auth_service.domain.interfaces.repositories import (
    IOrganizationMemberRepository,
    IOrganizationOrganizerRepository,
    IOrganizationRepository,
    IUserRepository,
)
from auth_service.domain.services.authentication_service import AuthenticationService
from auth_service.domain.services.organization_service import OrganizationService
from auth_service.domain.services.user_service import UserService
from auth_service.infrastructure.database.models.user_model import User
from auth_service.infrastructure.external.keycloak_service import KeycloakAdminService
from auth_service.infrastructure.repositories.organization_member_repository import (
    OrganizationMemberRepository,
)
from auth_service.infrastructure.repositories.organization_organizer_repository import (
    OrganizationOrganizerRepository,
)
from auth_service.infrastructure.repositories.organization_repository import (
    OrganizationRepository,
)
from auth_service.infrastructure.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer()


class OrgRole:
    """Constantes de função de organização."""

    OWNER = "OWNER"
    ORGANIZER = "ORGANIZER"
    MEMBER = "MEMBER"
    NONE = "NONE"


def get_user_repository(
    session: AsyncSession = Depends(get_session),
) -> IUserRepository:
    """Factory para UserRepository."""

    return UserRepository(session)


def get_organization_repository(
    session: AsyncSession = Depends(get_session),
) -> IOrganizationRepository:
    """Factory para OrganizationRepository."""

    return OrganizationRepository(session)


def get_organization_member_repository(
    session: AsyncSession = Depends(get_session),
) -> IOrganizationMemberRepository:
    """Factory para OrganizationMemberRepository."""

    return OrganizationMemberRepository(session)


def get_organization_organizer_repository(
    session: AsyncSession = Depends(get_session),
) -> IOrganizationOrganizerRepository:
    """Factory para OrganizationOrganizerRepository."""

    return OrganizationOrganizerRepository(session)


def get_keycloak_service() -> IKeycloakService:
    """Factory para KeycloakAdminService."""

    return KeycloakAdminService()


def get_user_service(
    user_repo: IUserRepository = Depends(get_user_repository),
    keycloak_service: IKeycloakService = Depends(get_keycloak_service),
) -> UserService:
    """Factory para UserService."""

    return UserService(user_repo, keycloak_service)


def get_organization_service(
    org_repo: IOrganizationRepository = Depends(get_organization_repository),
    member_repo: IOrganizationMemberRepository = Depends(
        get_organization_member_repository
    ),
    organizer_repo: IOrganizationOrganizerRepository = Depends(
        get_organization_organizer_repository
    ),
    user_repo: IUserRepository = Depends(get_user_repository),
) -> OrganizationService:
    """Factory para OrganizationService."""

    return OrganizationService(org_repo, member_repo, organizer_repo, user_repo)


def get_authentication_service(
    user_repo: IUserRepository = Depends(get_user_repository),
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
        issuer=f"http://athloshub.com.br/keycloak/realms/{settings.KEYCLOAK_REALM}",
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
            issuer=f"http://athloshub.com.br/keycloak/realms/{settings.KEYCLOAK_REALM}",
            verify_aud=False
        )

        user = await auth_service.get_or_create_user_from_keycloak_token(payload)
        return user
    except Exception:
        return None


UserRepositoryDep = Annotated[IUserRepository, Depends(get_user_repository)]
OrganizationRepositoryDep = Annotated[
    IOrganizationRepository, Depends(get_organization_repository)
]
MemberRepositoryDep = Annotated[
    IOrganizationMemberRepository, Depends(get_organization_member_repository)
]
OrganizerRepositoryDep = Annotated[
    IOrganizationOrganizerRepository, Depends(get_organization_organizer_repository)
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

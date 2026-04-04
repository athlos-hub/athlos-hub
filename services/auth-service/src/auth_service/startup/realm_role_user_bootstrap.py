"""Sincroniza usuários com uma realm role do Keycloak para o Postgres na subida do auth-service."""

import logging

from fastapi.concurrency import run_in_threadpool

from auth_service.core.config import settings
from auth_service.core.keycloak_provider import get_keycloak_admin_client
from auth_service.infrastructure.database.client import db
from auth_service.repositories.user_repository import UserRepository
from auth_service.services.authentication_service import AuthenticationService

logger = logging.getLogger(__name__)


async def bootstrap_local_users_from_realm_role() -> None:
    role_name = (settings.BOOTSTRAP_SYNC_LOCAL_USERS_REALM_ROLE or "").strip()
    if not role_name:
        return

    keycloak_admin = get_keycloak_admin_client()
    try:
        members = await run_in_threadpool(
            keycloak_admin.get_realm_role_members, role_name
        )
    except Exception as exc:
        msg = str(exc)
        logger.warning(
            "Não foi possível listar membros da realm role %s: %s", role_name, exc
        )
        if "403" in msg or "Forbidden" in msg:
            logger.warning(
                "O service account do client KEYCLOAK_CLIENT_ID precisa de papéis no client "
                "'realm-management' (ex.: view-users, query-users). No dev, reimporte o realm "
                "(keycloak/athlos-realm.json) ou em Clients → auth-client → Service account "
                "roles → realm-management, atribua view-users e query-users."
            )
        return

    if not members:
        logger.info(
            "Bootstrap realm role %s: nenhum usuário atribuído no Keycloak.", role_name
        )
        return

    async with db.session() as session:
        repo = UserRepository(session)
        auth = AuthenticationService(repo)
        for brief in members:
            uid = brief.get("id")
            if not uid:
                continue
            try:
                full = await run_in_threadpool(keycloak_admin.get_user, uid)
            except Exception as exc:
                logger.warning("Bootstrap: get_user %s falhou: %s", uid, exc)
                continue
            try:
                await auth.sync_local_user_from_keycloak_admin_rep(full)
            except Exception as exc:
                logger.warning(
                    "Bootstrap: falha ao sincronizar usuário Keycloak %s: %s", uid, exc
                )

    logger.info(
        "Bootstrap: processados %d usuário(s) com realm role %s.",
        len(members),
        role_name,
    )

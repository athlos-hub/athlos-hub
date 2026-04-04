from fastapi import APIRouter, Depends

from src.api.deps import get_bearer_authorization, get_current_keycloak_id
from src.schemas import api_success
from src.services.context_service import (
    can_post_as_organization,
    can_post_as_team,
    list_user_org_slugs,
)

router = APIRouter(tags=["social"])


@router.get("/context/organizations")
async def context_orgs(authorization: str = Depends(get_bearer_authorization)):
    slugs = await list_user_org_slugs(authorization)
    return api_success(slugs)


@router.get("/context/can-post-as-organization/{slug}")
async def context_can_org(
    slug: str,
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    await can_post_as_organization(slug, kid, authorization)
    return api_success({"allowed": True})


@router.get("/context/can-post-as-team/{team_id}")
async def context_can_team(
    team_id: str,
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    await can_post_as_team(team_id, kid, authorization)
    return api_success({"allowed": True})

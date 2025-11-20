from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.concurrency import run_in_threadpool
from ..schemas.auth_response import UserPublic
from ..services.auth_service import AuthService, keycloak_openid
from ..models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserPublic)
async def get_authenticated_user_info(db_user: User = Depends(AuthService.get_current_db_user)):
    try:
        return UserPublic(
            id=str(db_user.id),
            email=db_user.email,
            username=db_user.username,
            first_name=db_user.first_name or "",
            last_name=db_user.last_name or "",
            enabled=bool(db_user.enabled),
            email_verified=bool(db_user.email_verified),
            created_timestamp=db_user.created_at
        )
    except Exception as e:
        logger.error(f"Erro ao serializar usuário: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar dados do usuário."
        )


@router.post("/keycloak/callback")
async def keycloak_callback(payload: dict = Body(...)):
    code = payload.get("code")
    redirect_uri = payload.get("redirect_uri")

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campo 'code' é obrigatório")

    try:
        token_response = await run_in_threadpool(
            keycloak_openid.token,
            code=code,
            redirect_uri=redirect_uri,
            grant_type='authorization_code'
        )

        access_token = token_response.get('access_token')
        refresh_token = token_response.get('refresh_token')

        if not access_token:
            logger.error(f"Resposta inválida do Keycloak ao trocar code: {token_response}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao trocar code por token no Keycloak")

        token_payload = await AuthService.decode_token(access_token)
        db_user = await AuthService.get_or_create_user_from_keycloak_token(token_payload)

        user_data = {
            "id": str(db_user.id),
            "username": db_user.username,
            "email": db_user.email,
            "first_name": db_user.first_name or "",
            "last_name": db_user.last_name or "",
            "enabled": bool(db_user.enabled),
            "email_verified": bool(db_user.email_verified),
        }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no callback Keycloak: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao processar callback do Keycloak")

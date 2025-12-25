"""Endpoints de autenticação"""

import logging

from fastapi import APIRouter, BackgroundTasks, Body, File, Form, UploadFile, status

from auth_service.api.deps import AuthenticationServiceDep
from auth_service.core.config import settings
from auth_service.core.exceptions import KeycloakCommunicationError
from auth_service.domain.services.authentication_service import AuthenticationService
from auth_service.infrastructure.external.email_service import MailService
from auth_service.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    ResendEmailRequest,
    TokenResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/keycloak/callback")
async def keycloak_callback(
    auth_service: AuthenticationServiceDep,
    payload: dict = Body(...),
):
    """Processa callback OAuth do Keycloak e troca código por tokens."""

    code = payload.get("code", "")
    redirect_uri = payload.get("redirect_uri", "")

    result = await auth_service.handle_keycloak_callback(code, redirect_uri)
    return result


@router.post("/login", response_model=TokenResponse)
async def login(
    auth_service: AuthenticationServiceDep,
    credentials: LoginRequest = Body(...),
):
    """Autentica usuário com email/senha."""

    return await auth_service.login(credentials.email, credentials.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    auth_service: AuthenticationServiceDep,
    request: RefreshTokenRequest = Body(...),
):
    """Renova token de acesso usando refresh token."""

    return await auth_service.refresh_token(request.refresh_token)


@router.post("/logout")
async def logout(
    auth_service: AuthenticationServiceDep,
    request: LogoutRequest = Body(...),
):
    """Faz logout do usuário invalidando o refresh token."""

    return await auth_service.logout(request.refresh_token)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    auth_service: AuthenticationServiceDep,
    background: BackgroundTasks,
    email: str = Form(...),
    username: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    password: str = Form(...),
    avatar: UploadFile = File(None),
):
    """Registra uma nova conta de usuário."""

    result = await auth_service.register_user(
        email=email,
        username=username,
        first_name=first_name,
        last_name=last_name,
        password=password,
        avatar=avatar,
    )

    token = AuthenticationService.generate_email_token(result["id"])
    activation_link = f"{settings.FRONTEND_URL}/verify?token={token}"

    MailService.send_email_background(
        background,
        to=email,
        subject="Ative sua conta AthlosHub",
        template_name="verify_email.html",
        context={
            "name": first_name,
            "verification_link": activation_link,
            "expiry_hours": 24,
            "company_name": "AthlosHub",
            "support_email": "suporte@athloshub.com.br",
            "logo_url": "https://upload.wikimedia.org/wikipedia/commons/3/36/Logo_nike_principal.jpg",
        },
    )

    return result


@router.post("/verify/{token}")
async def verify_email(
    auth_service: AuthenticationServiceDep,
    token: str,
):
    """Verifica email do usuário usando token do link de email."""

    payload = AuthenticationService.decode_email_token(token)
    user_id = str(payload.get("sub", ""))

    result = await auth_service.activate_user(user_id)

    logger.info(f"Email verificado com sucesso para usuário ID: {user_id}")
    return {
        "message": "Email verificado com sucesso",
        "email": result.get("email"),
    }


@router.post("/resend-verification")
async def resend_verification_email(
    auth_service: AuthenticationServiceDep,
    payload: ResendEmailRequest,
    background: BackgroundTasks,
):
    """Reenvia link de verificação de email."""

    user_info = await auth_service.resend_verification_email(payload.email)

    token = AuthenticationService.generate_email_token(user_info["user_id"])
    verification_link = f"{settings.FRONTEND_URL}/verify?token={token}"

    MailService.send_email_background(
        background,
        to=user_info["email"],
        subject="Reenvio do link de verificação - AthlosHub",
        template_name="verify_email.html",
        context={
            "name": user_info["name"],
            "verification_link": verification_link,
            "expiry_hours": 24,
            "company_name": "AthlosHub",
            "support_email": "suporte@athloshub.com.br",
            "logo_url": "https://upload.wikimedia.org/wikipedia/commons/3/36/Logo_nike_principal.jpg",
        },
    )

    logger.info(f"Link de verificação reenviado para: {user_info['email']}")
    return {
        "success": True,
        "message": "Link de verificação reenviado com sucesso.",
    }


@router.get("/google/url")
async def get_google_auth_url():
    """Obtém URL de OAuth do Google via Keycloak."""

    try:
        auth_url = AuthenticationService.get_google_auth_url()
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Erro ao gerar URL do Google: {e}", exc_info=True)
        raise KeycloakCommunicationError("Erro ao gerar URL de autenticação")

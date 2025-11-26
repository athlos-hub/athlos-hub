from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from common.security.jwt_handler import JwtHandler
from urllib.parse import urlencode
from ..config.settings import settings
from ..schemas.auth_response import UserPublic, TokenResponse, LoginRequest, RegisterRequest, LogoutRequest, RefreshTokenRequest
from ..services.auth_service import AuthService, keycloak_openid
from ..services.mail_service import MailService
from ..models.user import User
from keycloak import KeycloakAdmin
from keycloak.exceptions import KeycloakPostError, KeycloakError
import logging
from database.client import db

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
            avatar_url=db_user.avatar_url or "",
            enabled=bool(db_user.enabled),
            email_verified=bool(db_user.email_verified),
            created_at=db_user.created_at,
            last_login_at=db_user.last_login_at
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

        public_key = await AuthService.get_public_key()

        token_payload = JwtHandler.decode_token(
            token=access_token,
            public_key=public_key,
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
        )
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


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest = Body(...)):
    try:
        token_response = await run_in_threadpool(
            keycloak_openid.token,
            username=credentials.username,
            password=credentials.password,
            grant_type="password"
        )

        if "error" in token_response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário ou senha incorretos"
            )

        access_token = token_response.get("access_token")

        public_key = await AuthService.get_public_key()
        token_payload = JwtHandler.decode_token(
            token=access_token,
            public_key=public_key,
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
        )
        await AuthService.get_or_create_user_from_keycloak_token(token_payload)

        return TokenResponse(
            access_token=access_token,
            refresh_token=token_response.get("refresh_token"),
            expires_in=token_response.get("expires_in")
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        if "invalid_grant" in error_msg or "unauthorized" in error_msg:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")

        logger.error(f"Erro no login: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno no login")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest = Body(...)):
    try:
        token_response = await run_in_threadpool(
            keycloak_openid.refresh_token,
            refresh_token=request.refresh_token
        )

        access_token = token_response.get("access_token")
        refresh_token = token_response.get("refresh_token")
        expires_in = token_response.get("expires_in", 300)

        if not access_token:
            logger.error(f"Resposta inválida do Keycloak no refresh: {token_response}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Falha ao renovar token no Keycloak"
            )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao renovar token: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado"
        )


@router.post("/logout")
async def logout(request: LogoutRequest = Body(...)):
    try:
        await run_in_threadpool(
            keycloak_openid.logout,
            refresh_token=request.refresh_token
        )
        return {"message": "Logout realizado com sucesso"}

    except KeycloakPostError as e:
        if e.response_code == 400:
            logger.info("Tentativa de logout com token já inválido ou expirado.")
            return {"message": "Logout realizado (Sessão já estava inativa)"}

        logger.error(f"Erro crítico no logout Keycloak: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar logout"
        )

    except Exception as e:
        logger.error(f"Erro de conexão no logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Falha de comunicação com servidor de autenticação"
        )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: RegisterRequest = Body(...), background: BackgroundTasks = None):
    try:
        keycloak_admin = KeycloakAdmin(
            server_url=settings.KEYCLOAK_URL,
            client_id=settings.KEYCLOAK_CLIENT_ID,
            client_secret_key=settings.KEYCLOAK_CLIENT_SECRET,
            realm_name=settings.KEYCLOAK_REALM,
            user_realm_name=settings.KEYCLOAK_REALM,
            verify=True
        )

        users_email = await run_in_threadpool(
            keycloak_admin.get_users, query={"email": user_data.email, "exact": True}
        )
        if users_email:
            raise HTTPException(400, "Email já cadastrado")

        users_username = await run_in_threadpool(
            keycloak_admin.get_users, query={"username": user_data.username, "exact": True}
        )
        if users_username:
            raise HTTPException(400, "Username já está em uso")

        user_attributes = {}
        if user_data.avatar_url:
            user_attributes["avatar_url"] = user_data.avatar_url

        new_user_id = await run_in_threadpool(
            keycloak_admin.create_user,
            {
                "email": user_data.email,
                "username": user_data.username,
                "firstName": user_data.first_name,
                "lastName": user_data.last_name,
                "enabled": False,
                "credentials": [{"value": user_data.password, "type": "password", "temporary": False}],
                "attributes": user_attributes
            }
        )

        try:
            await run_in_threadpool(
                AuthService.add_role_to_user,
                new_user_id,
                "player"
            )
        except Exception as role_error:
            logger.warning(f"Usuário criado, mas falha ao atribuir role 'player': {role_error}")

        try:
            await AuthService.get_or_create_user_from_keycloak_token({
                "sub": new_user_id,
                "email": user_data.email,
                "preferred_username": user_data.username,
                "given_name": user_data.first_name,
                "family_name": user_data.last_name,
                "enabled": False,
                "email_verified": False,
                "picture": user_data.avatar_url
            })
        except Exception as e:
            logger.error(f"Erro ao sincronizar usuário no banco: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao sincronizar usuário"
            )

        token = AuthService.generate_email_token(new_user_id)
        activation_link = f"{settings.FRONTEND_URL}/verify?token={token}"

        MailService.send_email_background(
            background,
            to=str(user_data.email),
            subject="Ative sua conta AthlosHub",
            template_name="verify_email.html",
            context={
                "name": user_data.first_name,
                "verification_link": activation_link,
                "expiry_hours": 24,
                "company_name": "AthlosHub",
                "support_email": "suporte@athloshub.com.br",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/3/36/Logo_nike_principal.jpg"
            }
        )

        return {"message": "Usuário criado com sucesso", "id": new_user_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no registro: {e}")
        raise HTTPException(500, "Falha ao criar usuário")


@router.get("/google/url")
async def get_google_auth_url():
    try:
        keycloak_url = settings.KEYCLOAK_URL.rstrip("/")
        realm = settings.KEYCLOAK_REALM
        base_url = f"{keycloak_url}/realms/{realm}/protocol/openid-connect/auth"

        params = {
            "client_id": settings.KEYCLOAK_CLIENT_ID,
            "redirect_uri": f"{settings.FRONTEND_URL}/auth/callback",
            "response_type": "code",
            "scope": "openid email profile",
            "kc_idp_hint": "google"
        }

        final_url = f"{base_url}?{urlencode(params)}"

        return {"auth_url": final_url}

    except Exception as e:
        logger.error(f"Erro ao gerar URL do Google: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar URL de autenticação"
        )
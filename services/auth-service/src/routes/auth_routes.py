from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from common.security.jwt_handler import JwtHandler
from common.exceptions import InvalidCredentialsError, TokenExpiredError
from urllib.parse import urlencode
import json
from ..config.settings import settings
from ..schemas.auth_response import UserPublic, TokenResponse, LoginRequest, RegisterRequest, LogoutRequest, \
    RefreshTokenRequest, ResendEmailRequest
from ..services.auth_service import AuthService, keycloak_openid
from ..services.mail_service import MailService
from ..models.user import User
from keycloak import KeycloakAdmin, KeycloakAuthenticationError
from keycloak.exceptions import KeycloakPostError, KeycloakConnectionError
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
        print(access_token)
        refresh_token = token_response.get('refresh_token')

        if not access_token:
            logger.error(f"Resposta inválida do Keycloak ao trocar code: {token_response}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                                detail="Falha ao trocar code por token no Keycloak")

        public_key = await AuthService.get_public_key()

        token_payload = JwtHandler.decode_token(
            token=access_token,
            public_key=public_key,
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
        )
        db_user = await AuthService.get_or_create_user_from_keycloak_token(token_payload)

        try:
            await run_in_threadpool(
                AuthService.add_role_to_user,
                db_user.keycloak_id,
                "player"
            )
        except Exception as role_error:
            logger.warning(f"Usuário {db_user.username} criado, mas falha ao atribuir role 'player': {role_error}")

        user_data = {
            "id": str(db_user.id),
            "username": db_user.username,
            "email": db_user.email,
            "first_name": db_user.first_name or "",
            "last_name": db_user.last_name or "",
            "avatar_url": db_user.avatar_url or "",
            "enabled": bool(db_user.enabled),
            "email_verified": bool(db_user.email_verified),
            "last_login_at": db_user.last_login_at
        }

        logger.info(f"Callback Keycloak bem-sucedido para usuário {db_user.username}")
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no callback Keycloak: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Erro ao processar callback do Keycloak")


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

        print(access_token)

        public_key = await AuthService.get_public_key()
        token_payload = JwtHandler.decode_token(
            token=access_token,
            public_key=public_key,
            audience=settings.KEYCLOAK_CLIENT_ID,
            issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM}"
        )
        await AuthService.get_or_create_user_from_keycloak_token(token_payload)

        logger.info(f"Login bem-sucedido para usuário: {credentials.username}")
        return TokenResponse(
            access_token=access_token,
            refresh_token=token_response.get("refresh_token"),
            expires_in=token_response.get("expires_in")
        )

    except (KeycloakPostError, KeycloakAuthenticationError) as e:
        error_message = str(e)
        try:
            if hasattr(e, 'response_body'):
                error_body = json.loads(e.response_body)
                description = error_body.get('error_description', '')
            else:
                import ast
                error_dict = ast.literal_eval(error_message)
                description = error_dict.get('error_description', '')
        except:
            description = error_message

        if "Account is not fully set up" in description:
            logger.warning(f"Tentativa de login com email não verificado: {credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "ACCOUNT_NOT_VERIFIED", "message": "Email não verificado"}
            )

        if "Account disabled" in description:
            logger.warning(f"Tentativa de login com conta desativada: {credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "ACCOUNT_DISABLED", "message": "Conta desativada pelo administrador"}
            )

        if "Invalid user credentials" in description or "invalid_grant" in str(e):
            logger.warning(f"Tentativa de login com credenciais inválidas: {credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos"
            )

        logger.error(f"Erro Keycloak desconhecido no login de {credentials.username}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falha na autenticação"
        )

    except Exception as e:
        logger.error(f"Erro interno no login: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno no login")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest = Body(...)):
    try:
        token_response = await run_in_threadpool(
            keycloak_openid.refresh_token,
            refresh_token=request.refresh_token
        )

        access_token = token_response.get("access_token")
        refresh_token_new = token_response.get("refresh_token")
        expires_in = token_response.get("expires_in", 300)

        if not access_token:
            logger.error(f"Resposta inválida do Keycloak no refresh: {token_response}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "code": "KEYCLOAK_ERROR",
                    "message": "Falha ao renovar token no Keycloak"
                }
            )

        logger.debug(f"Token renovado com sucesso. Expira em: {expires_in}s")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_new,
            expires_in=expires_in
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado ao renovar token: {e}", exc_info=True)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "REFRESH_ERROR",
                "message": "Falha ao renovar token. Por favor, faça login novamente."
            }
        )


@router.post("/logout")
async def logout(request: LogoutRequest = Body(...)):
    try:
        await run_in_threadpool(
            keycloak_openid.logout,
            refresh_token=request.refresh_token
        )
        logger.info("Logout realizado com sucesso")
        return {"message": "Logout realizado com sucesso"}

    except KeycloakPostError as e:
        if e.response_code == 400:
            logger.info("Tentativa de logout com token já inválido ou expirado")
            return {"message": "Logout realizado (Sessão já estava inativa)"}

        logger.error(f"Erro crítico no logout Keycloak: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar logout"
        )

    except Exception as e:
        logger.error(f"Erro de conexão no logout: {e}", exc_info=True)
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
            logger.warning(f"Tentativa de registro com email já cadastrado: {user_data.email}")
            raise HTTPException(400, "Email já cadastrado")

        users_username = await run_in_threadpool(
            keycloak_admin.get_users, query={"username": user_data.username, "exact": True}
        )
        if users_username:
            logger.warning(f"Tentativa de registro com username já em uso: {user_data.username}")
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
            logger.warning(f"Usuário {user_data.username} criado, mas falha ao atribuir role 'player': {role_error}")

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
            logger.error(f"Erro ao sincronizar usuário {user_data.username} no banco: {e}", exc_info=True)
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

        logger.info(f"Usuário registrado com sucesso: {user_data.username} (ID: {new_user_id})")
        return {"message": "Usuário criado com sucesso", "id": new_user_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no registro: {e}", exc_info=True)
        raise HTTPException(500, "Falha ao criar usuário")


@router.post("/verify/{token}")
async def verify_email(token: str):
    try:
        payload = JwtHandler.decode_email_token(
            token=token,
            secret_key=settings.EMAIL_TOKEN_SECRET
        )

        user_id = payload.get("sub")

        result = await AuthService.activate_user(user_id)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Erro ao ativar usuário")
            )

        logger.info(f"Email verificado com sucesso para usuário ID: {user_id}")
        return {
            "message": "Email verificado com sucesso",
            "email": result.get("email")
        }

    except TokenExpiredError:
        logger.warning(f"Tentativa de verificação com token expirado")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link de verificação expirado. Solicite um novo."
        )
    except InvalidCredentialsError as e:
        logger.warning(f"Erro de credenciais na verificação: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/resend-verification")
async def resend_verification_email(
        payload: ResendEmailRequest,
        background: BackgroundTasks
):
    try:
        user_id = None
        user_email = None
        user_name = None
        should_send_email = False

        async with db.session() as session:
            stmt = select(User).where(User.email == payload.email)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                logger.warning(f"Tentativa de reenvio de verificação para email não encontrado: {payload.email}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário não encontrado."
                )

            if user.email_verified:
                logger.info(f"Tentativa de reenvio de verificação para email já verificado: {payload.email}")
                return {"message": "Este email já foi verificado. Tente fazer login."}

            user_id = str(user.keycloak_id)
            user_email = str(user.email)
            user_name = user.first_name or user.username
            should_send_email = True

        if should_send_email:
            token = AuthService.generate_email_token(user_id)
            verification_link = f"{settings.FRONTEND_URL}/verify?token={token}"

            MailService.send_email_background(
                background,
                to=user_email,
                subject="Reenvio do link de verificação - AthlosHub",
                template_name="verify_email.html",
                context={
                    "name": user_name,
                    "verification_link": verification_link,
                    "expiry_hours": 24,
                    "company_name": "AthlosHub",
                    "support_email": "suporte@athloshub.com.br",
                    "logo_url": "https://upload.wikimedia.org/wikipedia/commons/3/36/Logo_nike_principal.jpg"
                }
            )

        logger.info(f"Link de verificação reenviado para: {user_email}")
        return {"success": True, "message": "Link de verificação reenviado com sucesso."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao reenviar email de verificação: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao processar o reenvio."
        )


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
        logger.error(f"Erro ao gerar URL do Google: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar URL de autenticação"
        )
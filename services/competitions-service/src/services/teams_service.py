from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
import uuid
import logging

from src.models.teams import TeamModel, PlayerModel, TeamStatus
from src.schemas.teams_schema import TeamCreateSchema
from src.models.competition import CompetitionModel, CompetitionStatus
from src.services.social_client import SocialServiceClient
from src.services.auth_client import (
    AuthClient,
    AuthClientError,
    AuthServiceUnavailable,
    MemberValidationFailed,
    OrganizationNotFound,
)
from src.config.settings import settings

if TYPE_CHECKING:
    from src.models.teams import TeamInviteModel

logger = logging.getLogger(__name__)


class TeamService:
    def __init__(self, db: AsyncSession, auth_client: Optional[AuthClient] = None):
        self.db = db
        self._auth_client = auth_client
        self.social_client = SocialServiceClient(settings.SOCIAL_SERVICE_URL)

    async def _get_auth_client(self) -> AuthClient:
        """Retorna o cliente de auth configurado."""
        if self._auth_client:
            return self._auth_client
        return AuthClient(
            base_url=settings.AUTH_SERVICE_URL,
            timeout=settings.AUTH_SERVICE_TIMEOUT
        )

    async def _validate_players_membership(
        self, 
        organization_slug: str, 
        keycloak_ids: List[uuid.UUID]
    ) -> None:
        """
        Valida se todos os jogadores são membros da organização.
        
        Args:
            organization_slug: Slug da organização
            keycloak_ids: Lista de Keycloak IDs dos usuários a validar
            
        Raises:
            HTTPException: Se algum usuário não for membro válido
        """
        auth_client = await self._get_auth_client()
        
        try:
            async with auth_client:
                await auth_client.validate_organization_members(
                    organization_slug=organization_slug,
                    keycloak_ids=keycloak_ids
                )
            logger.info(
                f"Validação de membros bem-sucedida para {len(keycloak_ids)} usuários "
                f"na organização {organization_slug}"
            )
        except OrganizationNotFound as e:
            logger.warning(f"Organização não encontrada: {organization_slug}")
            raise HTTPException(
                status_code=404,
                detail=f"Organização '{organization_slug}' não encontrada"
            ) from e
        except MemberValidationFailed as e:
            logger.warning(f"Validação de membros falhou: {e}")
            invalid_users_info = []
            for user in e.invalid_users:
                user_id = user.get("user_id")
                error = user.get("error", "Usuário inválido")
                username = user.get("username")
                if username:
                    invalid_users_info.append(f"{username}: {error}")
                else:
                    invalid_users_info.append(f"{user_id}: {error}")
            
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Alguns jogadores não são membros válidos da organização",
                    "invalid_users": invalid_users_info
                }
            ) from e
        except AuthServiceUnavailable as e:
            logger.error(f"Serviço de autenticação indisponível: {e}")
            raise HTTPException(
                status_code=503,
                detail="Serviço de autenticação temporariamente indisponível. Tente novamente mais tarde."
            ) from e
        except AuthClientError as e:
            logger.error(f"Erro ao validar membros: {e}")
            raise HTTPException(
                status_code=500,
                detail="Erro ao validar membros. Tente novamente mais tarde."
            ) from e

    async def _validate_players_not_in_competition(
        self,
        competition_id: int,
        keycloak_ids: List[uuid.UUID]
    ) -> None:
        """
        Verifica se algum jogador já está inscrito em outro time da mesma competição.
        
        Args:
            competition_id: ID da competição
            keycloak_ids: Lista de Keycloak IDs dos usuários a validar
            
        Raises:
            HTTPException: Se algum usuário já estiver em outro time
        """
        # Buscar jogadores que já estão em times desta competição
        query = (
            select(PlayerModel)
            .join(TeamModel, PlayerModel.team_id == TeamModel.id)
            .where(
                TeamModel.competition_id == competition_id,
                PlayerModel.keycloak_id.in_(keycloak_ids)
            )
        )
        result = await self.db.execute(query)
        existing_players = result.scalars().all()
        
        if existing_players:
            # Coletar informações dos jogadores duplicados
            duplicates = []
            for player in existing_players:
                duplicates.append({
                    "keycloak_id": str(player.keycloak_id),
                    "team_id": str(player.team_id)
                })
            
            duplicate_keycloak_ids = [str(p.keycloak_id) for p in existing_players]
            
            logger.warning(
                f"Jogadores já inscritos na competição {competition_id}: {duplicate_keycloak_ids}"
            )
            
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Alguns jogadores já estão inscritos em outro time desta competição",
                    "duplicate_players": duplicates
                }
            )
        
        logger.info(
            f"Validação de duplicidade OK: {len(keycloak_ids)} jogadores disponíveis "
            f"para competição {competition_id}"
        )

    async def create_team(self, data: TeamCreateSchema) -> TeamModel:
        """
        Cria um novo time para uma competição.
        
        Args:
            data: Dados do time a ser criado
            
        Returns:
            O time criado
            
        Raises:
            HTTPException: Se validações falharem
        """
        # 1. Validação da Competição
        query = select(CompetitionModel).where(CompetitionModel.id == data.competition_id)
        result = await self.db.execute(query)
        competition = result.scalar_one_or_none()

        if not competition:
            raise HTTPException(status_code=404, detail=f"Competition {data.competition_id} not found")
        
        # Validação do Status (garantindo comparação correta com Enum)
        if competition.status != CompetitionStatus.PENDING:
            raise HTTPException(status_code=400, detail="Competition must be PENDING to register teams")

        # 2. Validações de Jogadores
        num_players = len(data.players)
        if num_players < competition.min_members_per_team:
            raise HTTPException(
                status_code=400, 
                detail=f"Minimum {competition.min_members_per_team} players required. Provided: {num_players}"
            )
        
        if num_players > competition.max_members_per_team:
             raise HTTPException(
                status_code=400, 
                detail=f"Maximum {competition.max_members_per_team} players allowed. Provided: {num_players}"
            )

        captain_in_list = any(p.keycloak_id == data.captain_keycloak_id for p in data.players)
        if not captain_in_list:
            raise HTTPException(status_code=400, detail="Captain keycloak_id must be included in the players list")

        # 2.1 Validação de membros da organização via Auth Service
        player_keycloak_ids = [player.keycloak_id for player in data.players]
        await self._validate_players_membership(
            organization_slug=data.organization_slug,
            keycloak_ids=player_keycloak_ids
        )

        # 2.2 Verificar se algum jogador já está em outro time da mesma competição
        await self._validate_players_not_in_competition(
            competition_id=data.competition_id,
            keycloak_ids=player_keycloak_ids
        )

        # 3. Criação do Time (Inicialmente sem capitão para evitar ciclo)
        new_team = TeamModel(
            organization_slug=data.organization_slug,
            competition_id=data.competition_id,
            name=data.name,
            abbreviation=data.abbreviation,
            status=TeamStatus.PENDING,
            team_captain=None 
        )
        self.db.add(new_team)
        await self.db.flush() # Gera o ID do time

        # 4. Criação dos Jogadores
        created_players = []
        captain_player_obj = None

        for player_data in data.players:
            new_player = PlayerModel(
                id=uuid.uuid4(),
                team_id=new_team.id,
                keycloak_id=player_data.keycloak_id
            )
            self.db.add(new_player)
            created_players.append(new_player)

            if player_data.keycloak_id == data.captain_keycloak_id:
                captain_player_obj = new_player

        await self.db.flush()

        # 5. Atualiza o Capitão
        if captain_player_obj:
            new_team.team_captain = captain_player_obj.id
            self.db.add(new_team) 
        else:
            raise HTTPException(status_code=400, detail="Captain not found in generated players")
        
        # 6. Commit final
        await self.db.commit()

        # --- CORREÇÃO DO ERRO MissingGreenlet ---
        # Precisamos recarregar o time do banco trazendo a lista de 'players' explicitamente.
        # Isso preenche o objeto para o Pydantic ler sem erro.
        query_refresh = (
            select(TeamModel)
            .options(selectinload(TeamModel.players)) # Carrega a relação players
            .where(TeamModel.id == new_team.id)
        )
        result_refresh = await self.db.execute(query_refresh)
        loaded_team = result_refresh.scalar_one()

        # 7. Criar perfil no social-service
        try:
            await self.social_client.create_team_profile(
                team_id=str(loaded_team.id),
                organization_slug=loaded_team.organization_slug
            )
            logger.info(f"Perfil criado no social-service para time {loaded_team.id}")
        except Exception as e:
            # Não falhar a criação do time se houver erro ao criar perfil
            logger.error(f"Erro ao criar perfil do time no social-service: {str(e)}")
        
        return loaded_team

    # ==================== Métodos de Listagem de Times ====================
    
    async def get_user_teams(self, keycloak_id: uuid.UUID) -> list:
        """
        Retorna todos os times do usuário.
        """
        from src.schemas.teams_schema import TeamListItemSchema
        
        # Buscar todos os players do usuário
        query = (
            select(PlayerModel)
            .where(PlayerModel.keycloak_id == keycloak_id)
        )
        result = await self.db.execute(query)
        players = result.scalars().all()
        
        if not players:
            return []
        
        team_ids = [p.team_id for p in players]
        
        # Buscar os times com informações da competição
        teams_query = (
            select(TeamModel)
            .options(
                selectinload(TeamModel.players),
                selectinload(TeamModel.competition)
            )
            .where(TeamModel.id.in_(team_ids))
            .order_by(TeamModel.created_at.desc())
        )
        teams_result = await self.db.execute(teams_query)
        teams = teams_result.scalars().all()
        
        result_list = []
        for team in teams:
            # Determinar role do usuário
            is_captain = team.team_captain is not None and any(
                p.id == team.team_captain and p.keycloak_id == keycloak_id 
                for p in team.players
            )
            role = "CAPTAIN" if is_captain else "PLAYER"
            
            result_list.append({
                "id": team.id,
                "name": team.name,
                "abbreviation": team.abbreviation,
                "status": team.status.value if hasattr(team.status, 'value') else team.status,
                "organization_slug": team.organization_slug,
                "competition_id": team.competition_id,
                "team_captain": team.team_captain,
                "created_at": team.created_at,
                "competition_name": team.competition.name if team.competition else None,
                "organization_name": None,  # TODO: buscar do auth-service
                "player_count": len(team.players),
                "role": role,
            })
        
        return result_list
    
    async def get_team_detail(
        self, 
        team_id: uuid.UUID, 
        keycloak_id: Optional[uuid.UUID] = None
    ) -> Optional[dict]:
        """
        Retorna os detalhes de um time específico.
        """
        query = (
            select(TeamModel)
            .options(
                selectinload(TeamModel.players),
                selectinload(TeamModel.competition)
            )
            .where(TeamModel.id == team_id)
        )
        result = await self.db.execute(query)
        team = result.scalar_one_or_none()
        
        if not team:
            return None
        
        # Determinar role do usuário se autenticado
        role = None
        if keycloak_id:
            user_player = next(
                (p for p in team.players if p.keycloak_id == keycloak_id), 
                None
            )
            if user_player:
                is_captain = team.team_captain is not None and user_player.id == team.team_captain
                role = "CAPTAIN" if is_captain else "PLAYER"
        
        return {
            "id": team.id,
            "name": team.name,
            "abbreviation": team.abbreviation,
            "status": team.status.value if hasattr(team.status, 'value') else team.status,
            "organization_slug": team.organization_slug,
            "competition_id": team.competition_id,
            "team_captain": team.team_captain,
            "created_at": team.created_at,
            "competition_name": team.competition.name if team.competition else "Competição",
            "organization_name": None,  # TODO: buscar do auth-service
            "modality_name": None,  # TODO: buscar da modalidade
            "players": [
                {
                    "id": p.id,
                    "team_id": p.team_id,
                    "keycloak_id": p.keycloak_id,
                }
                for p in team.players
            ],
            "role": role,
        }

    # ==================== Métodos de Convite ====================
    
    async def get_team_by_id(self, team_id: uuid.UUID) -> Optional[TeamModel]:
        """Busca um time pelo ID."""
        query = (
            select(TeamModel)
            .options(
                selectinload(TeamModel.players),
                selectinload(TeamModel.competition)
            )
            .where(TeamModel.id == team_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _verify_is_captain(self, team: TeamModel, keycloak_id: uuid.UUID) -> None:
        """
        Verifica se o usuário é o capitão do time.
        
        Raises:
            HTTPException 403: Se não for o capitão
        """
        # Buscar o player que corresponde ao keycloak_id
        captain_player = None
        for player in team.players:
            if player.keycloak_id == keycloak_id:
                captain_player = player
                break
        
        if not captain_player or team.team_captain != captain_player.id:
            raise HTTPException(
                status_code=403,
                detail="Apenas o capitão do time pode gerar convites"
            )

    async def generate_invite(
        self,
        team_id: uuid.UUID,
        created_by_keycloak_id: uuid.UUID,
        expires_in_days: int = 7,
        max_uses: Optional[int] = None,
        base_url: str = "http://localhost:3000"
    ) -> "TeamInviteModel":
        """
        Gera um convite para um time.
        
        Args:
            team_id: ID do time
            created_by_keycloak_id: Keycloak ID de quem está criando (deve ser capitão)
            expires_in_days: Dias até expirar
            max_uses: Número máximo de usos (None = ilimitado)
            base_url: URL base para montar o link de convite
            
        Returns:
            TeamInviteModel com o convite criado
            
        Raises:
            HTTPException 404: Time não encontrado
            HTTPException 403: Não é o capitão
            HTTPException 400: Competição não está em status válido
        """
        from src.models.teams import TeamInviteModel, InviteStatus
        from datetime import timedelta
        
        # 1. Buscar o time
        team = await self.get_team_by_id(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Time não encontrado")
        
        # 2. Verificar se é o capitão
        await self._verify_is_captain(team, created_by_keycloak_id)
        
        # 3. Verificar se a competição ainda aceita inscrições
        if team.competition.status != CompetitionStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail="A competição não está mais aceitando novos jogadores"
            )
        
        # 4. Verificar se o time ainda tem vagas
        current_players = len(team.players)
        if current_players >= team.competition.max_members_per_team:
            raise HTTPException(
                status_code=400,
                detail=f"Time já atingiu o limite de {team.competition.max_members_per_team} jogadores"
            )
        
        # 5. Criar o convite
        invite = TeamInviteModel(
            team_id=team_id,
            invite_token=TeamInviteModel.generate_token(),
            created_by=created_by_keycloak_id,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days),
            status=InviteStatus.PENDING,
            max_uses=max_uses,
            use_count=0
        )
        
        self.db.add(invite)
        await self.db.commit()
        await self.db.refresh(invite)
        
        logger.info(
            f"Convite criado para time {team_id} por {created_by_keycloak_id}. "
            f"Token: {invite.invite_token[:8]}... Expira em: {expires_in_days} dias"
        )
        
        return invite

    async def get_invite_by_token(self, invite_token: str) -> Optional["TeamInviteModel"]:
        """Busca um convite pelo token."""
        from src.models.teams import TeamInviteModel
        
        query = (
            select(TeamInviteModel)
            .options(
                selectinload(TeamInviteModel.team).selectinload(TeamModel.competition),
                selectinload(TeamInviteModel.team).selectinload(TeamModel.players),
                selectinload(TeamInviteModel.team).selectinload(TeamModel.captain),
            )
            .where(TeamInviteModel.invite_token == invite_token)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def validate_invite(self, invite_token: str) -> dict:
        """
        Valida um convite e retorna informações sobre ele.
        Usado para mostrar preview antes do usuário aceitar.
        
        Returns:
            Dict com informações do convite e sua validade
        """
        from src.models.teams import InviteStatus
        
        invite = await self.get_invite_by_token(invite_token)
        
        if not invite:
            return {
                "valid": False,
                "error": "Convite não encontrado"
            }
        
        if invite.status != InviteStatus.PENDING:
            return {
                "valid": False,
                "error": f"Convite está {invite.status.value.lower()}"
            }
        
        if datetime.utcnow() > invite.expires_at.replace(tzinfo=None):
            return {
                "valid": False,
                "error": "Convite expirado"
            }
        
        if invite.max_uses is not None and invite.use_count >= invite.max_uses:
            return {
                "valid": False,
                "error": "Convite atingiu o limite de usos"
            }
        
        remaining_uses = None
        if invite.max_uses is not None:
            remaining_uses = invite.max_uses - invite.use_count
        
        return {
            "valid": True,
            "team_id": invite.team_id,
            "team_name": invite.team.name,
            "organization_slug": invite.team.organization_slug,
            "competition_id": invite.team.competition_id,
            "competition_name": invite.team.competition.name if invite.team.competition else None,
            "expires_at": invite.expires_at,
            "remaining_uses": remaining_uses
        }

    async def accept_invite(
        self,
        invite_token: str,
        keycloak_id: uuid.UUID
    ) -> dict:
        """
        Aceita um convite e adiciona o usuário ao time.
        
        Args:
            invite_token: Token do convite
            keycloak_id: Keycloak ID do usuário que está aceitando
            
        Returns:
            Dict com informações do time e player criado
            
        Raises:
            HTTPException 404: Convite não encontrado
            HTTPException 400: Convite inválido, usuário já no time, etc.
        """
        from src.models.teams import TeamInviteModel, InviteStatus
        
        # 1. Buscar e validar o convite
        invite = await self.get_invite_by_token(invite_token)
        
        if not invite:
            raise HTTPException(status_code=404, detail="Convite não encontrado")
        
        if not invite.is_valid:
            if invite.status != InviteStatus.PENDING:
                raise HTTPException(
                    status_code=400,
                    detail=f"Convite está {invite.status.value.lower()}"
                )
            if datetime.utcnow() > invite.expires_at.replace(tzinfo=None):
                raise HTTPException(status_code=400, detail="Convite expirado")
            if invite.max_uses is not None and invite.use_count >= invite.max_uses:
                raise HTTPException(status_code=400, detail="Convite atingiu o limite de usos")
        
        team = invite.team
        competition = team.competition
        
        # 2. Verificar se a competição ainda aceita inscrições
        if competition.status != CompetitionStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail="A competição não está mais aceitando novos jogadores"
            )
        
        # 3. Verificar se o time ainda tem vagas
        current_players = len(team.players)
        if current_players >= competition.max_members_per_team:
            raise HTTPException(
                status_code=400,
                detail=f"Time já atingiu o limite de {competition.max_members_per_team} jogadores"
            )
        
        # 4. Validar que o usuário é membro da organização
        await self._validate_players_membership(
            organization_slug=team.organization_slug,
            keycloak_ids=[keycloak_id]
        )
        
        # 5. Verificar se o usuário já está neste time
        for player in team.players:
            if player.keycloak_id == keycloak_id:
                raise HTTPException(
                    status_code=400,
                    detail="Você já é membro deste time"
                )
        
        # 6. Verificar se o usuário já está em outro time desta competição
        await self._validate_players_not_in_competition(
            competition_id=competition.id,
            keycloak_ids=[keycloak_id]
        )
        
        # 7. Criar o player
        new_player = PlayerModel(
            id=uuid.uuid4(),
            team_id=team.id,
            keycloak_id=keycloak_id
        )
        self.db.add(new_player)
        
        # 8. Atualizar o convite
        invite.use_count += 1
        invite.accepted_by = keycloak_id
        invite.accepted_at = datetime.utcnow()
        
        # Se atingiu o limite de usos, marca como aceito (usado)
        if invite.max_uses is not None and invite.use_count >= invite.max_uses:
            invite.status = InviteStatus.ACCEPTED
        
        await self.db.commit()
        await self.db.refresh(new_player)
        
        logger.info(
            f"Usuário {keycloak_id} entrou no time {team.id} ({team.name}) "
            f"via convite {invite.invite_token[:8]}..."
        )

        await self._notify_captain_new_member(team, competition, keycloak_id)

        return {
            "message": "Você entrou no time com sucesso!",
            "team_id": team.id,
            "team_name": team.name,
            "player_id": new_player.id,
            "competition_id": competition.id
        }

    async def _notify_captain_new_member(
        self,
        team: TeamModel,
        competition: CompetitionModel,
        new_member_keycloak_id: uuid.UUID,
    ) -> None:
        if not team.team_captain or not team.captain:
            return
        captain = team.captain
        if captain.keycloak_id == new_member_keycloak_id:
            return
        try:
            auth_client = await self._get_auth_client()
            async with auth_client:
                captain_user_id = await auth_client.get_user_internal_id_by_keycloak(
                    captain.keycloak_id
                )
            if captain_user_id is None:
                return
            from src.services.notifications_client import send_competition_notification

            slug = team.organization_slug
            action = f"/organizations/{slug}/competitions/{competition.id}" if slug else None
            await send_competition_notification(
                user_id=captain_user_id,
                notification_type="competition_team_member_joined",
                title="Novo membro no time",
                message=(
                    f"Um jogador entrou no time {team.name} "
                    f"na competição {competition.name}."
                ),
                extra_data={
                    "team_id": str(team.id),
                    "team_name": team.name,
                    "competition_id": competition.id,
                    "competition_name": competition.name,
                    "organization_slug": team.organization_slug,
                    "new_member_keycloak_id": str(new_member_keycloak_id),
                },
                action_url=action,
            )
        except Exception as e:
            logger.warning("Notificação ao capitão não enviada: %s", e)

    async def revoke_invite(
        self,
        invite_token: str,
        keycloak_id: uuid.UUID
    ) -> None:
        """
        Revoga um convite (apenas o capitão pode fazer isso).
        
        Args:
            invite_token: Token do convite
            keycloak_id: Keycloak ID de quem está revogando (deve ser capitão)
        """
        from src.models.teams import InviteStatus
        
        invite = await self.get_invite_by_token(invite_token)
        
        if not invite:
            raise HTTPException(status_code=404, detail="Convite não encontrado")
        
        if invite.status != InviteStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Convite já está {invite.status.value.lower()}"
            )
        
        # Verificar se é o capitão
        await self._verify_is_captain(invite.team, keycloak_id)
        
        invite.status = InviteStatus.REVOKED
        await self.db.commit()
        
        logger.info(f"Convite {invite_token[:8]}... revogado por {keycloak_id}")

    async def list_team_invites(
        self,
        team_id: uuid.UUID,
        keycloak_id: uuid.UUID
    ) -> List["TeamInviteModel"]:
        """
        Lista todos os convites de um time (apenas capitão pode ver).
        """
        from src.models.teams import TeamInviteModel, InviteStatus
        
        team = await self.get_team_by_id(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Time não encontrado")
        
        # Verificar se é o capitão
        await self._verify_is_captain(team, keycloak_id)
        
        query = (
            select(TeamInviteModel)
            .where(TeamInviteModel.team_id == team_id)
            .order_by(TeamInviteModel.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

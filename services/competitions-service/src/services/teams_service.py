from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload # <--- Importante!
from typing import List, Optional
import uuid
import logging

from src.models.teams import TeamModel, PlayerModel, TeamStatus
from src.schemas.teams_schema import TeamCreateSchema
from src.models.competition import CompetitionModel, CompetitionStatus
from src.services.auth_client import (
    AuthClient,
    AuthClientError,
    AuthServiceUnavailable,
    MemberValidationFailed,
    OrganizationNotFound,
)
from src.config.settings import settings

logger = logging.getLogger(__name__)


class TeamService:
    def __init__(self, db: AsyncSession, auth_client: Optional[AuthClient] = None):
        self.db = db
        self._auth_client = auth_client

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
        
        return loaded_team
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload # <--- Importante!
from typing import List
import uuid

from src.models.teams import TeamModel, PlayerModel, TeamStatus
from src.schemas.teams_schema import TeamCreateSchema
from src.models.competition import CompetitionModel, CompetitionStatus

class TeamService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_team(self, data: TeamCreateSchema) -> TeamModel:
        # 1. Busca e Valida a Competição
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

        captain_in_list = any(p.user_id == data.captain_user_id for p in data.players)
        if not captain_in_list:
            raise HTTPException(status_code=400, detail="Captain user_id must be included in the players list")

        # 3. Criação do Time (Inicialmente sem capitão para evitar ciclo)
        new_team = TeamModel(
            org_code=data.org_code,
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
                user_id=player_data.user_id
            )
            self.db.add(new_player)
            created_players.append(new_player)

            if player_data.user_id == data.captain_user_id:
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
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_
from datetime import datetime, timedelta, time
from fastapi import HTTPException

from src.models.matches import MatchModel, MatchStatus
from src.models.competition import CompetitionModel
from src.models.modality import ModalityModel 
from src.schemas.matches_schema import MatchPeriodFilter, MatchUpdateRequest

class MatchesService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_matches_by_org(
        self, 
        org_code: str, 
        period: MatchPeriodFilter = MatchPeriodFilter.ALL
    ):
        # 1. Monta a Query Base com Joins
        # Match -> Competition -> Modality
        query = (
            select(MatchModel)
            .join(MatchModel.competition) # Join com Competition
            .join(CompetitionModel.modality) # Join com Modality
            .where(ModalityModel.org_code == org_code)
            .order_by(MatchModel.scheduled_datetime)
            .options(
                # Carrega os relacionamentos para o Schema preencher os nomes
                selectinload(MatchModel.competition).selectinload(CompetitionModel.modality),
                selectinload(MatchModel.home_team),
                selectinload(MatchModel.away_team)
            )
        )

        # 2. Aplica Filtros de Data
        now = datetime.now()
        
        if period == MatchPeriodFilter.TODAY:
            # Do inicio (00:00) ao fim (23:59) de hoje
            start_of_day = datetime.combine(now.date(), time.min)
            end_of_day = datetime.combine(now.date(), time.max)
            
            query = query.where(
                and_(
                    MatchModel.scheduled_datetime >= start_of_day,
                    MatchModel.scheduled_datetime <= end_of_day
                )
            )

        elif period == MatchPeriodFilter.WEEK:
            # Semana atual (Segunda a Domingo ou Domingo a Sábado, dependendo da regra)
            # Aqui faremos: Hoje até o fim dos próximos 7 dias (Jogos da semana)
            # OU se quiser a semana calendário (Segunda a Domingo):
            start_of_week = now - timedelta(days=now.weekday()) # Segunda-feira
            start_of_week = datetime.combine(start_of_week.date(), time.min)
            
            end_of_week = start_of_week + timedelta(days=6) # Domingo
            end_of_week = datetime.combine(end_of_week.date(), time.max)

            query = query.where(
                and_(
                    MatchModel.scheduled_datetime >= start_of_week,
                    MatchModel.scheduled_datetime <= end_of_week
                )
            )
            
        # Se for ALL, não aplica filtro de data

        # 3. Executa
        result = await self.session.execute(query)
        matches = result.scalars().all()

        # 4. Formatação Manual para o Schema (Flattening)
        # Como o Schema pede 'competition_name' e 'modality_name' flat,
        # e o Model tem isso aninhado, podemos fazer um map ou deixar o Pydantic tentar resolver.
        # Mas para garantir performance e estrutura, vou mapear manualmente aqui ou 
        # ajustar o Model do Pydantic para pegar nested attributes.
        # Vamos usar uma abordagem de construção de lista para facilitar:
        
        response_list = []
        for m in matches:
            response_list.append({
                "id": m.id,
                "status": m.status,
                "scheduled_datetime": m.scheduled_datetime,
                "local": m.local,
                "round_match_number": m.round_match_number,
                "competition_name": m.competition.name,
                "modality_name": m.competition.modality.name,
                "home_team": m.home_team,
                "away_team": m.away_team,
                "home_score": m.home_score,
                "away_score": m.away_score
            })
            
        return response_list
    
    async def get_matches_by_competition(
        self, 
        competition_id: int, 
        period: MatchPeriodFilter = MatchPeriodFilter.ALL
    ):
        """
        Busca jogos de uma competição específica com filtros de data.
        """
        # 1. Query Base (Filtrando por Competition ID)
        query = (
            select(MatchModel)
            .where(MatchModel.competition_id == competition_id)
            .order_by(MatchModel.scheduled_datetime, MatchModel.round_id) # Ordena por data e depois rodada
            .options(
                selectinload(MatchModel.home_team),
                selectinload(MatchModel.away_team),
                selectinload(MatchModel.round) # Carrega o nome da rodada
            )
        )

        # 2. Aplica Filtros de Data (Reaproveitando a lógica)
        now = datetime.now()
        
        if period == MatchPeriodFilter.TODAY:
            start_of_day = datetime.combine(now.date(), time.min)
            end_of_day = datetime.combine(now.date(), time.max)
            query = query.where(
                and_(
                    MatchModel.scheduled_datetime >= start_of_day,
                    MatchModel.scheduled_datetime <= end_of_day
                )
            )

        elif period == MatchPeriodFilter.WEEK:
            start_of_week = now - timedelta(days=now.weekday())
            start_of_week = datetime.combine(start_of_week.date(), time.min)
            
            end_of_week = start_of_week + timedelta(days=6)
            end_of_week = datetime.combine(end_of_week.date(), time.max)
            
            query = query.where(
                and_(
                    MatchModel.scheduled_datetime >= start_of_week,
                    MatchModel.scheduled_datetime <= end_of_week
                )
            )

        # 3. Executa
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_matches_by_team(
        self, 
        team_id: uuid.UUID, 
        period: MatchPeriodFilter = MatchPeriodFilter.ALL
    ):
        """
        Busca todos os jogos onde o time participa (Seja como Home ou Away).
        """
        # 1. Query Base: Time é Mandante OU Visitante
        query = (
            select(MatchModel)
            .where(
                or_(
                    MatchModel.home_team_id == team_id,
                    MatchModel.away_team_id == team_id
                )
            )
            .order_by(MatchModel.scheduled_datetime)
            .options(
                # Carregamos Competição e Modalidade para contexto
                selectinload(MatchModel.competition).selectinload(CompetitionModel.modality),
                selectinload(MatchModel.home_team),
                selectinload(MatchModel.away_team),
                selectinload(MatchModel.round)
            )
        )

        # 2. Filtros de Data (Reaproveitados)
        now = datetime.now()
        
        if period == MatchPeriodFilter.TODAY:
            start_of_day = datetime.combine(now.date(), time.min)
            end_of_day = datetime.combine(now.date(), time.max)
            query = query.where(
                and_(
                    MatchModel.scheduled_datetime >= start_of_day,
                    MatchModel.scheduled_datetime <= end_of_day
                )
            )

        elif period == MatchPeriodFilter.WEEK:
            start_of_week = now - timedelta(days=now.weekday())
            start_of_week = datetime.combine(start_of_week.date(), time.min)
            
            end_of_week = start_of_week + timedelta(days=6)
            end_of_week = datetime.combine(end_of_week.date(), time.max)
            
            query = query.where(
                and_(
                    MatchModel.scheduled_datetime >= start_of_week,
                    MatchModel.scheduled_datetime <= end_of_week
                )
            )

        # 3. Executa
        result = await self.session.execute(query)
        matches = result.scalars().all()

        # 4. Formatação (Flattening)
        # Usamos uma estrutura similar ao MatchOrgResponse para mostrar o contexto
        response_list = []
        for m in matches:
            response_list.append({
                "id": m.id,
                "status": m.status,
                "scheduled_datetime": m.scheduled_datetime,
                "local": m.local,
                "round_match_number": m.round_match_number,
                
                # Contexto extra é útil aqui (qual campeonato é esse jogo?)
                "competition_name": m.competition.name,
                "modality_name": m.competition.modality.name,
                
                "home_team": m.home_team,
                "away_team": m.away_team,
                "home_score": m.home_score,
                "away_score": m.away_score,
                "round": m.round # Opcional, se quiser mostrar a fase
            })
            
        return response_list
    
    async def update_match_details(self, match_id: uuid.UUID, update_data: MatchUpdateRequest):
        """
        Atualiza data, hora e local de um jogo.
        Valida se a data não é no passado.
        """
        # 1. Busca o Jogo
        query = select(MatchModel).where(MatchModel.id == match_id)
        result = await self.session.execute(query)
        match = result.scalar_one_or_none()

        if not match:
            raise HTTPException(status_code=404, detail="Jogo não encontrado.")

        # 2. Atualiza Data/Hora (com Validação)
        if update_data.scheduled_datetime:
            # Remove info de fuso horário para comparação simples (naive) ou garanta que ambos tenham timezone
            now = datetime.now()
            new_date = update_data.scheduled_datetime.replace(tzinfo=None) # Garante naive para comparação

            if new_date < now:
                raise HTTPException(
                    status_code=400, 
                    detail="Não é possível agendar um jogo para uma data no passado."
                )
            
            match.scheduled_datetime = update_data.scheduled_datetime
            
            # Se o jogo estava PENDENTE (sem data), agora está AGENDADO
            if match.status == MatchStatus.PENDING:
                match.status = MatchStatus.SCHEDULED

        # 3. Atualiza Local
        if update_data.local:
            match.local = update_data.local

        # 4. Persiste
        self.session.add(match)
        await self.session.commit()
        await self.session.refresh(match)
        
        return match
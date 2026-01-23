import uuid
from typing import Optional, List, Dict

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.models.matches import MatchModel, SegmentModel, MatchStatus
from src.models.competition import CompetitionModel, CompetitionSystem, CompetitionPhase
from src.models.standings import ClassificationModel
from src.models.stats import StatsRuleSetModel, StatsTypeModel, PlayerStatsModel


class ManageMatchesService:
	def __init__(self, session: AsyncSession):
		self.session = session

	async def register_score(
		self,
		match_id: uuid.UUID,
		team_side: str,  # "home" | "away"
		increment: int = 1,
		segment_id: Optional[int] = None,
		stats_metric_abbreviation: Optional[str] = None,
		player_id: Optional[uuid.UUID] = None,
	) -> MatchModel:
		"""
		Registra pontuação para um jogo.

		- Se "segment_id" for informado, incrementa o placar do segmento e reflete no placar total do jogo.
		- Caso contrário, incrementa diretamente no placar do jogo (sem segmentos).

		Regras de Stats:
		- Se a competição tiver um StatsRuleSet, exige "player_id" e uma métrica (via "stats_metric_abbreviation").
		- Valida se a métrica pertence ao ruleset e incrementa PlayerStats do jogador para o jogo.
		"""

		if team_side not in ("home", "away"):
			raise HTTPException(status_code=400, detail="team_side deve ser 'home' ou 'away'.")

		# 1) Carrega o jogo (com segmentos para facilitar soma em memória)
		q_match = (
			select(MatchModel)
			.where(MatchModel.id == match_id)
			.options(selectinload(MatchModel.segments))
		)
		result = await self.session.execute(q_match)
		match: Optional[MatchModel] = result.scalar_one_or_none()

		if not match:
			raise HTTPException(status_code=404, detail="Jogo não encontrado.")

		# Verifica se o jogo está no status "live"
		if match.status != MatchStatus.LIVE:
			raise HTTPException(
				status_code=400, 
				detail=f"Não é possível registrar pontuação. O jogo deve estar no status 'live' (status atual: {match.status})."
			)


		# 2) Atualiza placar
		if segment_id is not None:
			# Atualiza o segmento específico
			q_segment = select(SegmentModel).where(
				SegmentModel.id == segment_id, SegmentModel.match_id == match.id
			)
			seg_res = await self.session.execute(q_segment)
			segment = seg_res.scalar_one_or_none()
			if not segment:
				raise HTTPException(status_code=404, detail="Segmento não encontrado para este jogo.")

			if team_side == "home":
				segment.home_score = (segment.home_score or 0) + max(0, increment)
			else:
				segment.away_score = (segment.away_score or 0) + max(0, increment)

			self.session.add(segment)

			# Recalcula o placar total do jogo com base nos segmentos
			total_home = sum((s.home_score or 0) for s in match.segments)
			total_away = sum((s.away_score or 0) for s in match.segments)
			match.home_score = total_home
			match.away_score = total_away
		else:
			# Jogo sem segmentação: incrementa diretamente
			if team_side == "home":
				match.home_score = (match.home_score or 0) + max(0, increment)
			else:
				match.away_score = (match.away_score or 0) + max(0, increment)

		self.session.add(match)

		# 3) Regras de Stats
		# Verifica se a competição registra métricas
		rs_q = select(StatsRuleSetModel).where(StatsRuleSetModel.competition_id == match.competition_id)
		rs_res = await self.session.execute(rs_q)
		ruleset = rs_res.scalar_one_or_none()

		if ruleset:
			# Ao existir ruleset, exigimos player e métrica
			if not player_id:
				raise HTTPException(status_code=400, detail="player_id é obrigatório quando a competição possui métricas.")
			if not stats_metric_abbreviation:
				raise HTTPException(status_code=400, detail="stats_metric_abbreviation é obrigatório quando a competição possui métricas.")

			# Valida se a métrica existe no ruleset (por abreviação)
			st_q = select(StatsTypeModel).where(
				StatsTypeModel.stats_ruleset_id == ruleset.id,
				StatsTypeModel.abbreviation == stats_metric_abbreviation,
			)
			st_res = await self.session.execute(st_q)
			stats_type = st_res.scalar_one_or_none()

			if not stats_type:
				raise HTTPException(status_code=400, detail="Métrica informada não pertence ao StatsRuleSet da competição.")

			# Busca/Cria PlayerStats para (player, tipo, match)
			ps_q = select(PlayerStatsModel).where(
				PlayerStatsModel.player_id == player_id,
				PlayerStatsModel.stats_type_id == stats_type.id,
				PlayerStatsModel.match_id == match.id,
			)
			ps_res = await self.session.execute(ps_q)
			player_stats = ps_res.scalar_one_or_none()

			if player_stats:
				player_stats.value = (player_stats.value or 0) + max(0, increment)
			else:
				player_stats = PlayerStatsModel(
					player_id=player_id,
					stats_type_id=stats_type.id,
					match_id=match.id,
					value=max(0, increment),
				)

			self.session.add(player_stats)

		# 4) Persiste alterações
		await self.session.commit()
		await self.session.refresh(match)
		return match

	async def set_score(
		self,
		match_id: uuid.UUID,
		home_score: int,
		away_score: int,
		segments: Optional[List[Dict]] = None,
		stats_events: Optional[List[Dict]] = None,
	) -> MatchModel:
		"""
		Seta placar específico para um jogo, com suporte a segmentos e eventos de stats.

		- Requer o jogo em status LIVE.
		- Se `segments` for fornecido, atualiza os segmentos e recalcula o total do jogo pela soma dos segmentos.
		- Caso contrário, seta diretamente `home_score` e `away_score` no jogo.
		- `stats_events` (opcional): lista de dicts contendo `{player_id, abbreviation, value}`.
		  Se a competição possuir StatsRuleSet, valida e incrementa PlayerStats de cada evento.
		"""

		# Normaliza valores
		home_score = max(0, int(home_score))
		away_score = max(0, int(away_score))

		# 1) Carrega jogo com segmentos
		q_match = (
			select(MatchModel)
			.where(MatchModel.id == match_id)
			.options(selectinload(MatchModel.segments))
		)
		result = await self.session.execute(q_match)
		match: Optional[MatchModel] = result.scalar_one_or_none()

		if not match:
			raise HTTPException(status_code=404, detail="Jogo não encontrado.")

		# Status deve ser LIVE
		if match.status != MatchStatus.LIVE:
			raise HTTPException(
				status_code=400,
				detail=f"Não é possível setar placar. O jogo deve estar 'live' (status atual: {match.status}).",
			)

		# 2) Atualiza segmentos ou placar direto
		if segments and len(segments) > 0:
			for seg in segments:
				seg_id = seg.get("segment_id")
				seg_home = max(0, int(seg.get("home_score", 0)))
				seg_away = max(0, int(seg.get("away_score", 0)))

				if seg_id is None:
					raise HTTPException(status_code=400, detail="Cada segmento deve conter 'segment_id'.")

				q_segment = select(SegmentModel).where(
					SegmentModel.id == seg_id, SegmentModel.match_id == match.id
				)
				seg_res = await self.session.execute(q_segment)
				segment = seg_res.scalar_one_or_none()
				if not segment:
					raise HTTPException(status_code=404, detail=f"Segmento {seg_id} não encontrado para este jogo.")

				segment.home_score = seg_home
				segment.away_score = seg_away
				self.session.add(segment)

			# Recalcula total baseado nos segmentos
			total_home = sum((s.home_score or 0) for s in match.segments)
			total_away = sum((s.away_score or 0) for s in match.segments)
			match.home_score = total_home
			match.away_score = total_away
		else:
			match.home_score = home_score
			match.away_score = away_score

		self.session.add(match)

		# 3) Processa eventos de stats (opcional)
		rs_q = select(StatsRuleSetModel).where(StatsRuleSetModel.competition_id == match.competition_id)
		rs_res = await self.session.execute(rs_q)
		ruleset = rs_res.scalar_one_or_none()

		if stats_events:
			if not ruleset:
				raise HTTPException(status_code=400, detail="Não é possível registrar stats: competição não possui StatsRuleSet.")

			for evt in stats_events:
				player_id = evt.get("player_id")
				abbreviation = evt.get("abbreviation")
				value = max(0, int(evt.get("value", 0)))

				if not player_id or not abbreviation:
					raise HTTPException(status_code=400, detail="Cada evento de stats deve conter 'player_id' e 'abbreviation'.")

				st_q = select(StatsTypeModel).where(
					StatsTypeModel.stats_ruleset_id == ruleset.id,
					StatsTypeModel.abbreviation == abbreviation,
				)
				st_res = await self.session.execute(st_q)
				stats_type = st_res.scalar_one_or_none()
				if not stats_type:
					raise HTTPException(status_code=400, detail=f"Métrica '{abbreviation}' não pertence ao StatsRuleSet.")

				ps_q = select(PlayerStatsModel).where(
					PlayerStatsModel.player_id == player_id,
					PlayerStatsModel.stats_type_id == stats_type.id,
					PlayerStatsModel.match_id == match.id,
				)
				ps_res = await self.session.execute(ps_q)
				player_stats = ps_res.scalar_one_or_none()

				if player_stats:
					player_stats.value = (player_stats.value or 0) + value
				else:
					player_stats = PlayerStatsModel(
						player_id=player_id,
						stats_type_id=stats_type.id,
						match_id=match.id,
						value=value,
					)
				self.session.add(player_stats)

		# 4) Persiste
		await self.session.commit()
		await self.session.refresh(match)
		return match

	async def finalize_match(self, match_id: uuid.UUID) -> MatchModel:
		q_match = (
			select(MatchModel)
			.where(MatchModel.id == match_id)
			.options(selectinload(MatchModel.segments))
		)
		res = await self.session.execute(q_match)
		match: Optional[MatchModel] = res.scalar_one_or_none()

		if not match:
			raise HTTPException(status_code=404, detail="Jogo não encontrado.")

		if match.status != MatchStatus.LIVE:
			raise HTTPException(status_code=400, detail=f"Só é possível finalizar jogos em status 'live' (status atual: {match.status}).")

		if not match.home_team_id or not match.away_team_id:
			raise HTTPException(status_code=400, detail="Jogo sem times definidos não pode ser finalizado.")

		seg_has_values = any(((s.home_score or 0) > 0 or (s.away_score or 0) > 0) for s in (match.segments or []))

		if seg_has_values and match.segments:
			reg_home = sum((s.home_score or 0) for s in match.segments if getattr(s, "segment_type", "").upper() not in ("OVERTIME", "PENALTY"))
			reg_away = sum((s.away_score or 0) for s in match.segments if getattr(s, "segment_type", "").upper() not in ("OVERTIME", "PENALTY"))
			ot_home = sum((s.home_score or 0) for s in match.segments if getattr(s, "segment_type", "").upper() == "OVERTIME")
			ot_away = sum((s.away_score or 0) for s in match.segments if getattr(s, "segment_type", "").upper() == "OVERTIME")
			pen_home = sum((s.home_score or 0) for s in match.segments if getattr(s, "segment_type", "").upper() == "PENALTY")
			pen_away = sum((s.away_score or 0) for s in match.segments if getattr(s, "segment_type", "").upper() == "PENALTY")

			total_home = reg_home + ot_home
			total_away = reg_away + ot_away

			winner_team_id: Optional[uuid.UUID] = None

			if total_home > total_away:
				winner_team_id = match.home_team_id
			elif total_away > total_home:
				winner_team_id = match.away_team_id
			else:
				if match.has_penalties and (pen_home != pen_away):
					winner_team_id = match.home_team_id if pen_home > pen_away else match.away_team_id
		else:
			total_home = match.home_score or 0
			total_away = match.away_score or 0

			winner_team_id: Optional[uuid.UUID] = None

			if total_home > total_away:
				winner_team_id = match.home_team_id
			elif total_away > total_home:
				winner_team_id = match.away_team_id

		# Carrega competição para decidir regra de pontos
		q_comp = select(CompetitionModel).where(CompetitionModel.id == match.competition_id)
		comp_res = await self.session.execute(q_comp)
		competition = comp_res.scalar_one_or_none()
		if not competition:
			raise HTTPException(status_code=404, detail="Competição do jogo não encontrada.")

		assign_points = False
		if competition.system == CompetitionSystem.POINTS:
			assign_points = True
		elif competition.system == CompetitionSystem.MIXED:
			if match.group_id is not None:
				assign_points = True
			else:
				assign_points = False
		else:
			assign_points = False

		match.home_score = total_home
		match.away_score = total_away
		match.winner_team_id = winner_team_id
		match.status = MatchStatus.FINISHED
		self.session.add(match)

		# Atualiza standings
		await self._update_standings_after_match(competition, match, total_home, total_away, winner_team_id, assign_points)

		await self.session.commit()
		await self.session.refresh(match)
		return match

	async def _update_standings_after_match(
		self,
		competition: CompetitionModel,
		match: MatchModel,
		home_score: int,
		away_score: int,
		winner_team_id: Optional[uuid.UUID],
	) -> None:
		
		assign_points = True
		if (competition.system == competition.system == CompetitionSystem.ELIMINATION) or \
		   (competition.system == CompetitionSystem.MIXED and competition.current_phase == CompetitionPhase.ELIMINATION):
			assign_points = False

		def _fetch_class(team_id: uuid.UUID):
			if match.group_id is not None:
				q = select(ClassificationModel).where(
					ClassificationModel.competition_id == competition.id,
					ClassificationModel.team_id == team_id,
					ClassificationModel.group_id == match.group_id,
				)
				return q
			else:
				q = select(ClassificationModel).where(
					ClassificationModel.competition_id == competition.id,
					ClassificationModel.team_id == team_id,
					ClassificationModel.group_id.is_(None),
				)
				return q

		# Home standing
		res_h = await self.session.execute(_fetch_class(match.home_team_id))
		h_st: Optional[ClassificationModel] = res_h.scalar_one_or_none()
		# Fallback sem group
		if not h_st and match.group_id is not None:
			res_h = await self.session.execute(
				select(ClassificationModel).where(
					ClassificationModel.competition_id == competition.id,
					ClassificationModel.team_id == match.home_team_id,
					ClassificationModel.group_id.is_(None),
				)
			)
			h_st = res_h.scalar_one_or_none()

		# Away standing
		res_a = await self.session.execute(_fetch_class(match.away_team_id))
		a_st: Optional[ClassificationModel] = res_a.scalar_one_or_none()
		if not a_st and match.group_id is not None:
			res_a = await self.session.execute(
				select(ClassificationModel).where(
					ClassificationModel.competition_id == competition.id,
					ClassificationModel.team_id == match.away_team_id,
					ClassificationModel.group_id.is_(None),
				)
			)
			a_st = res_a.scalar_one_or_none()

		if not h_st or not a_st:
			return

		h_st.games_played += 1
		a_st.games_played += 1

		h_st.score_pro += home_score
		h_st.score_against += away_score
		h_st.score_balance = h_st.score_pro - h_st.score_against

		a_st.score_pro += away_score
		a_st.score_against += home_score
		a_st.score_balance = a_st.score_pro - a_st.score_against

		if winner_team_id is None:
			if assign_points:
				h_st.draws += 1
				a_st.draws += 1
				h_st.points += 1
				a_st.points += 1
		else:
			if winner_team_id == match.home_team_id:
				h_st.wins += 1
				a_st.losses += 1
				if assign_points:
					h_st.points += 3
			else:
				a_st.wins += 1
				h_st.losses += 1
				if assign_points:
					a_st.points += 3

		self.session.add_all([h_st, a_st])
	
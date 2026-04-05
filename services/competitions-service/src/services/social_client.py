"""
Client para comunicação com o Social Service
"""
import logging
from typing import Optional, Dict, Any
from enum import Enum

import httpx

from src.config.settings import settings

logger = logging.getLogger(__name__)


class AchievementType(str, Enum):
    """Tipos de conquistas disponíveis"""
    # Conquistas de Jogadores
    TOP_SCORER = "TOP_SCORER"
    CHAMPION = "CHAMPION"
    RUNNER_UP = "RUNNER_UP"
    UNDEFEATED = "UNDEFEATED"
    HAT_TRICK_WINS = "HAT_TRICK_WINS"
    
    # Conquistas de Times
    TEAM_CHAMPION = "TEAM_CHAMPION"
    BEST_DEFENSE = "BEST_DEFENSE"
    POWERFUL_ATTACK = "POWERFUL_ATTACK"
    TEAM_UNDEFEATED = "TEAM_UNDEFEATED"
    
    # Conquistas Gerais
    VETERAN = "VETERAN"
    MULTI_CHAMPION = "MULTI_CHAMPION"


class TargetType(str, Enum):
    """Tipo de alvo da conquista"""
    PLAYER = "PLAYER"
    TEAM = "TEAM"


class SocialServiceClient:
    """Cliente para comunicação com o Social Service"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.timeout = httpx.Timeout(10.0, connect=5.0)
        
    async def notify_achievement(
        self,
        target_id: str,
        target_type: TargetType,
        achievement_type: AchievementType,
        competition_id: str,
        competition_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Notifica o Social Service sobre uma conquista
        
        Args:
            target_id: ID do jogador (keycloak_id) ou time (team_id)
            target_type: Tipo do alvo (PLAYER ou TEAM)
            achievement_type: Tipo da conquista
            competition_id: ID da competição
            competition_name: Nome da competição
            metadata: Dados adicionais (score, posição, etc)
            
        Returns:
            True se a notificação foi bem sucedida
        """
        payload = {
            "targetId": target_id,
            "targetType": target_type.value,
            "achievementType": achievement_type.value,
            "competitionId": competition_id,
            "competitionName": competition_name,
            "metadata": metadata or {},
        }

        if settings.RABBITMQ_URL:
            from src.infrastructure.messaging.social_achievement_publisher import (
                publish_achievement_event,
            )

            await publish_achievement_event(payload)
            logger.info(
                "Conquista %s enfileirada (athlos.social) para %s (%s)",
                achievement_type.value,
                target_id,
                target_type.value,
            )
            return True

        url = f"{self.base_url}/api/social/achievements/notify"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info(
                    f"Enviando conquista {achievement_type.value} para {target_id} ({target_type.value})"
                )
                
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    logger.info(f"Conquista {achievement_type.value} notificada com sucesso")
                    return True
                else:
                    logger.error(
                        f"Erro ao notificar conquista: {response.status_code} - {response.text}"
                    )
                    return False
                    
        except httpx.TimeoutException:
            logger.error(f"Timeout ao notificar conquista para {target_id}")
            return False
        except Exception as e:
            logger.error(f"Erro ao notificar conquista: {str(e)}", exc_info=True)
            return False
    
    async def create_team_profile(
        self,
        team_id: str,
        organization_slug: str,
        *,
        approved_for_social: bool = True,
    ) -> bool:
        """
        Cria ou obtém perfil de time no Social Service
        
        Args:
            team_id: ID do time
            organization_slug: Slug da organização
            approved_for_social: Libera visibilidade social (times aprovados na competição)
            
        Returns:
            True se o perfil foi criado/obtido com sucesso
        """
        url = f"{self.base_url}/api/social/team-profiles"
        
        payload = {
            "teamId": team_id,
            "organizationSlug": organization_slug,
            "approvedForSocial": approved_for_social,
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.info(f"Criando/obtendo perfil de time {team_id}")
                
                response = await client.post(url, json=payload)
                
                if response.status_code in (200, 201):
                    logger.info(f"Perfil de time {team_id} criado/obtido com sucesso")
                    return True
                else:
                    logger.error(
                        f"Erro ao criar perfil de time: {response.status_code} - {response.text}"
                    )
                    return False
                    
        except Exception as e:
            logger.error(f"Erro ao criar perfil de time: {str(e)}", exc_info=True)
            return False

    async def delete_team_profile(self, team_id: str) -> bool:
        """
        Remove perfil do time no social (posts do time, follows, linha em team_profiles).
        team_id: UUID do time no competitions-service.
        """
        url = f"{self.base_url}/api/social/internal/team-profiles/{team_id}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.delete(url)
                if response.status_code in (204, 200):
                    logger.info("Perfil social do time %s removido", team_id)
                    return True
                if response.status_code == 404:
                    logger.info(
                        "Perfil social do time %s já ausente (404)", team_id
                    )
                    return True
                logger.error(
                    "Erro ao remover perfil de time: %s - %s",
                    response.status_code,
                    response.text,
                )
                return False
        except Exception as e:
            logger.error(
                "Erro ao remover perfil de time: %s", str(e), exc_info=True
            )
            return False

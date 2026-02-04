from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from src.routes.routes import get_session
from src.services.scoreboard_service import ScoreboardService
from src.schemas.scoreboard_schema import ScoreboardSchema, UpdateScoreRequest
from src.websockets.scoreboard_manager import scoreboard_manager

router = APIRouter(prefix="/scoreboard", tags=["scoreboard"])

@router.websocket("/ws/{match_id}")
async def scoreboard_websocket(
    websocket: WebSocket,
    match_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    WebSocket endpoint para receber atualizações em tempo real do placar de uma partida.
    
    Conecte-se em: ws://localhost:8001/api/v1/scoreboard/ws/{match_id}
    
    Mensagens recebidas:
    {
        "type": "scoreboard_update",
        "data": {
            "match_id": "uuid",
            "home_total_score": 2,
            "away_total_score": 1,
            "segments": [...],
            ...
        }
    }
    """
    await scoreboard_manager.connect(websocket, match_id)
    
    try:
        # Envia o placar inicial ao conectar
        service = ScoreboardService(session)
        try:
            scoreboard = await service.get_scoreboard(uuid.UUID(match_id))
            await websocket.send_json({
                "type": "initial_scoreboard",
                "data": scoreboard.model_dump(mode="json")
            })
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": f"Erro ao carregar placar: {str(e)}"
            })
        
        # Mantém a conexão aberta
        while True:
            # Aguarda mensagens do cliente (ping/pong para manter conexão)
            data = await websocket.receive_text()
            
            # Pode implementar comandos do cliente aqui se necessário
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        scoreboard_manager.disconnect(websocket, match_id)
    except Exception as e:
        print(f"[ScoreboardWS] Erro na conexão: {e}")
        scoreboard_manager.disconnect(websocket, match_id)


@router.get("/{match_id}", response_model=ScoreboardSchema)
async def get_match_scoreboard(
    match_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Obtém o placar atual de uma partida (sem WebSocket).
    """
    service = ScoreboardService(session)
    return await service.get_scoreboard(uuid.UUID(match_id))


@router.post("/{match_id}/update", response_model=ScoreboardSchema)
async def update_segment_score(
    match_id: str,
    update_data: UpdateScoreRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Atualiza o placar de um segment específico.
    
    Esta atualização será transmitida automaticamente via WebSocket
    para todos os clientes conectados.
    """
    service = ScoreboardService(session)
    return await service.update_segment_score(uuid.UUID(match_id), update_data)


@router.post("/{match_id}/initialize")
async def initialize_match_segments(
    match_id: str,
    num_segments: int = 2,
    session: AsyncSession = Depends(get_session)
):
    """
    Inicializa os segments de uma partida (ex: 2 tempos de futebol).
    
    Deve ser chamado uma vez antes de começar a registrar placares.
    """
    service = ScoreboardService(session)
    return await service.initialize_segments(uuid.UUID(match_id), num_segments)

"""SSE: broadcast in-process da contagem de não lidas por usuário."""

import asyncio
import json
from collections import defaultdict
from collections.abc import AsyncGenerator
from uuid import UUID

# Sem bytes no fio, proxies (ex.: Kong read_timeout padrão 60s) fecham a conexão.
_KEEPALIVE_INTERVAL_S = 20.0


class UnreadBroadcaster:
    def __init__(self) -> None:
        self._queues: dict[str, set[asyncio.Queue[int]]] = defaultdict(set)

    async def stream_counts(
        self,
        user_id: UUID,
        initial_count: int,
    ) -> AsyncGenerator[int | None, None]:
        key = str(user_id)
        q: asyncio.Queue[int] = asyncio.Queue()
        self._queues[key].add(q)
        try:
            yield initial_count
            while True:
                try:
                    count = await asyncio.wait_for(q.get(), timeout=_KEEPALIVE_INTERVAL_S)
                    yield count
                except asyncio.TimeoutError:
                    yield None
        finally:
            self._queues[key].discard(q)
            if not self._queues[key]:
                del self._queues[key]

    async def publish(self, user_id: UUID, count: int) -> None:
        key = str(user_id)
        for queue in list(self._queues.get(key, ())):
            await queue.put(count)


_broadcaster: UnreadBroadcaster | None = None


def get_broadcaster() -> UnreadBroadcaster:
    global _broadcaster
    if _broadcaster is None:
        _broadcaster = UnreadBroadcaster()
    return _broadcaster


def sse_event(count: int) -> str:
    return f"data: {json.dumps({'count': count})}\n\n"


def sse_keepalive() -> str:
    """Comentário SSE (ignorado pelo cliente); mantém conexão viva atrás de proxies."""
    return ": keepalive\n\n"

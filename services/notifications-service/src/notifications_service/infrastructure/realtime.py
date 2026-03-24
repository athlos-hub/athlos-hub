"""SSE: broadcast in-process da contagem de não lidas por usuário."""

import asyncio
import json
from collections import defaultdict
from collections.abc import AsyncGenerator, Awaitable, Callable
from uuid import UUID


class UnreadBroadcaster:
    def __init__(self) -> None:
        self._queues: dict[str, set[asyncio.Queue[int]]] = defaultdict(set)

    async def stream_counts(
        self,
        user_id: UUID,
        initial_count: int,
    ) -> AsyncGenerator[int, None]:
        key = str(user_id)
        q: asyncio.Queue[int] = asyncio.Queue()
        self._queues[key].add(q)
        try:
            yield initial_count
            while True:
                yield await q.get()
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

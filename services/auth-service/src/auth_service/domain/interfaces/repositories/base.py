"""Interface base de repositório"""

from abc import ABC, abstractmethod


class IBaseRepository(ABC):
    """Interface base de repositório com operações comuns."""

    @abstractmethod
    async def commit(self) -> None:
        """Confirma a transação atual."""
        ...

    @abstractmethod
    async def rollback(self) -> None:
        """Reverte a transação atual."""
        ...

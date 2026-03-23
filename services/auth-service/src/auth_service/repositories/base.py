"""Contratos base de repositório."""

from abc import ABC, abstractmethod


class BaseRepositoryContract(ABC):
    @abstractmethod
    async def commit(self) -> None:
        ...

    @abstractmethod
    async def rollback(self) -> None:
        ...


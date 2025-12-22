"""
Factory para criação de usuários de teste.

A factory permite criar objetos de teste de forma flexível e reutilizável,
seguindo o padrão factory pattern do pytest.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid

from src.models.user import User


class UserFactory:
    """
    Factory para criação de usuários de teste.
    
    Uso:
        # Criar um usuário padrão
        user = await user_factory()
        
        # Criar um usuário não verificado
        user = await user_factory(email_verified=False, enabled=False)
        
        # Criar um usuário admin
        user = await user_factory(username="admin", email="admin@test.com")
    """
    
    _counter = 0
    
    @classmethod
    def _next_counter(cls) -> int:
        cls._counter += 1
        return cls._counter
    
    @classmethod
    def build(
        cls,
        *,
        id: Optional[uuid.UUID] = None,
        keycloak_id: Optional[str] = None,
        email: Optional[str] = None,
        username: Optional[str] = None,
        first_name: str = "Test",
        last_name: str = "User",
        avatar_url: Optional[str] = None,
        enabled: bool = True,
        email_verified: bool = True,
    ) -> User:
        """
        Constrói um objeto User sem persistir no banco.
        
        Args:
            id: UUID do usuário (gerado automaticamente se não fornecido)
            keycloak_id: ID do Keycloak (gerado automaticamente se não fornecido)
            email: Email do usuário (gerado automaticamente se não fornecido)
            username: Username do usuário (gerado automaticamente se não fornecido)
            first_name: Primeiro nome
            last_name: Sobrenome
            avatar_url: URL do avatar
            enabled: Se o usuário está ativo
            email_verified: Se o email foi verificado
            
        Returns:
            User: Objeto User não persistido
        """
        counter = cls._next_counter()
        now = datetime.now(timezone.utc)
        
        return User(
            id=id or uuid.uuid4(),
            keycloak_id=keycloak_id or str(uuid.uuid4()),
            email=email or f"user{counter}@example.com",
            username=username or f"user{counter}",
            first_name=first_name,
            last_name=last_name,
            avatar_url=avatar_url,
            enabled=enabled,
            email_verified=email_verified,
            created_at=now,
            updated_at=now,
        )
    
    @classmethod
    async def create(
        cls,
        session,
        **kwargs
    ) -> User:
        """
        Cria e persiste um User no banco de dados.
        
        Args:
            session: Sessão assíncrona do SQLAlchemy
            **kwargs: Argumentos para build()
            
        Returns:
            User: Objeto User persistido
        """
        user = cls.build(**kwargs)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user
    
    @classmethod
    async def create_verified(cls, session, **kwargs) -> User:
        """Cria um usuário verificado (padrão)."""
        return await cls.create(
            session,
            enabled=True,
            email_verified=True,
            **kwargs
        )
    
    @classmethod
    async def create_unverified(cls, session, **kwargs) -> User:
        """Cria um usuário não verificado."""
        return await cls.create(
            session,
            enabled=False,
            email_verified=False,
            **kwargs
        )
    
    @classmethod
    async def create_disabled(cls, session, **kwargs) -> User:
        """Cria um usuário desabilitado."""
        return await cls.create(
            session,
            enabled=False,
            email_verified=True,
            **kwargs
        )

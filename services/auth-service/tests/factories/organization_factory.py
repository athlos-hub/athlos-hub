"""
Factories para criação de organizações e membros de teste.

As factories permitem criar objetos de teste de forma flexível e reutilizável,
seguindo o padrão factory pattern do pytest.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid

from src.models.user import User
from src.models.organization import Organization, OrganizationMember
from src.models.enums import MemberStatus, OrganizationPrivacy, OrganizationStatus


class OrganizationFactory:
    """
    Factory para criação de organizações de teste.
    
    Uso:
        # Criar uma organização pública
        org = await organization_factory(owner=user)
        
        # Criar uma organização privada
        org = await organization_factory(owner=user, privacy=OrganizationPrivacy.PRIVATE)
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
        owner_id: uuid.UUID,
        id: Optional[uuid.UUID] = None,
        name: Optional[str] = None,
        slug: Optional[str] = None,
        description: str = "Uma organização de teste",
        logo_url: Optional[str] = None,
        privacy: OrganizationPrivacy = OrganizationPrivacy.PUBLIC,
        status: OrganizationStatus = OrganizationStatus.ACTIVE,
    ) -> Organization:
        """
        Constrói um objeto Organization sem persistir no banco.
        """
        counter = cls._next_counter()
        now = datetime.now(timezone.utc)
        
        org_name = name or f"Organization {counter}"
        org_slug = slug or f"organization-{counter}"
        
        return Organization(
            id=id or uuid.uuid4(),
            name=org_name,
            slug=org_slug,
            description=description,
            logo_url=logo_url,
            privacy=privacy,
            status=status,
            owner_id=owner_id,
            created_at=now,
            updated_at=now,
        )
    
    @classmethod
    async def create(
        cls,
        session,
        owner: User,
        *,
        add_owner_as_member: bool = True,
        **kwargs
    ) -> Organization:
        """
        Cria e persiste uma Organization no banco de dados.
        
        Args:
            session: Sessão assíncrona do SQLAlchemy
            owner: Usuário dono da organização
            add_owner_as_member: Se deve adicionar o owner como membro
            **kwargs: Argumentos para build()
            
        Returns:
            Organization: Objeto Organization persistido
        """
        org = cls.build(owner_id=owner.id, **kwargs)
        session.add(org)
        
        if add_owner_as_member:
            member = OrganizationMemberFactory.build(
                organization_id=org.id,
                user_id=owner.id,
                status=MemberStatus.ACTIVE,
            )
            session.add(member)
        
        await session.commit()
        await session.refresh(org)
        return org
    
    @classmethod
    async def create_public(cls, session, owner: User, **kwargs) -> Organization:
        """Cria uma organização pública."""
        return await cls.create(
            session,
            owner,
            privacy=OrganizationPrivacy.PUBLIC,
            **kwargs
        )
    
    @classmethod
    async def create_private(cls, session, owner: User, **kwargs) -> Organization:
        """Cria uma organização privada."""
        return await cls.create(
            session,
            owner,
            privacy=OrganizationPrivacy.PRIVATE,
            **kwargs
        )


class OrganizationMemberFactory:
    """Factory para criação de membros de organização."""
    
    @classmethod
    def build(
        cls,
        *,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        id: Optional[uuid.UUID] = None,
        status: MemberStatus = MemberStatus.PENDING,
    ) -> OrganizationMember:
        """Constrói um objeto OrganizationMember sem persistir."""
        now = datetime.now(timezone.utc)
        
        return OrganizationMember(
            id=id or uuid.uuid4(),
            organization_id=organization_id,
            user_id=user_id,
            status=status,
            created_at=now,
            updated_at=now,
        )
    
    @classmethod
    async def create(
        cls,
        session,
        organization: Organization,
        user: User,
        **kwargs
    ) -> OrganizationMember:
        """Cria e persiste um OrganizationMember no banco de dados."""
        member = cls.build(
            organization_id=organization.id,
            user_id=user.id,
            **kwargs
        )
        session.add(member)
        await session.commit()
        await session.refresh(member)
        return member
    
    @classmethod
    async def create_active(cls, session, organization: Organization, user: User) -> OrganizationMember:
        """Cria um membro ativo."""
        return await cls.create(session, organization, user, status=MemberStatus.ACTIVE)
    
    @classmethod
    async def create_pending(cls, session, organization: Organization, user: User) -> OrganizationMember:
        """Cria um membro pendente."""
        return await cls.create(session, organization, user, status=MemberStatus.PENDING)

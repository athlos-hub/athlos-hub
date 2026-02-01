"""Unit tests for utility functions."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException

from auth_service.infrastructure.database.models.user_model import User
from auth_service.infrastructure.database.models.organization_model import Organization, OrganizationMember
from auth_service.infrastructure.database.models.enums import (
    MemberStatus,
    OrganizationJoinPolicy,
    OrganizationPrivacy,
    OrganizationStatus,
)


class TestCanUserJoinOrganization:
    """Tests for can_user_join_organization utility function."""

    @pytest.fixture
    def mock_session(self):
        """Create a mock async session."""
        session = AsyncMock()
        session.scalar = AsyncMock()
        return session

    @pytest.fixture
    def sample_user(self):
        """Create a sample user."""
        return User(
            id=uuid4(),
            keycloak_id=str(uuid4()),
            email="test@test.com",
            username="testuser",
            enabled=True,
            email_verified=True,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    @pytest.fixture
    def sample_organization(self):
        """Create a sample organization."""
        return Organization(
            id=uuid4(),
            name="Test Org",
            slug="test-org",
            description="Test",
            owner_id=uuid4(),
            privacy=OrganizationPrivacy.PUBLIC,
            join_policy=OrganizationJoinPolicy.REQUEST_ONLY,
            status=OrganizationStatus.ACTIVE,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    @pytest.mark.asyncio
    async def test_user_not_active_raises_error(self, mock_session, sample_user, sample_organization):
        """Test HTTPException raised when user is not active."""
        from auth_service.utils.organization_utils import can_user_join_organization

        # User is not active
        mock_session.scalar.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await can_user_join_organization(
                sample_organization, sample_user, mock_session
            )

        assert exc_info.value.status_code == 403
        assert "ativa" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_existing_pending_membership_raises_error(
        self, mock_session, sample_user, sample_organization
    ):
        """Test HTTPException raised when user has pending membership."""
        from auth_service.utils.organization_utils import can_user_join_organization

        existing_member = OrganizationMember(
            id=uuid4(),
            organization_id=sample_organization.id,
            user_id=sample_user.id,
            status=MemberStatus.PENDING,
            created_at=datetime.now(),
        )
        
        # First call: user is active, Second call: existing membership found
        mock_session.scalar.side_effect = [sample_user, existing_member]

        with pytest.raises(HTTPException) as exc_info:
            await can_user_join_organization(
                sample_organization, sample_user, mock_session
            )

        assert exc_info.value.status_code == 409
        assert "pendente" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_existing_invited_membership_raises_error(
        self, mock_session, sample_user, sample_organization
    ):
        """Test HTTPException raised when user has invited membership."""
        from auth_service.utils.organization_utils import can_user_join_organization

        existing_member = OrganizationMember(
            id=uuid4(),
            organization_id=sample_organization.id,
            user_id=sample_user.id,
            status=MemberStatus.INVITED,
            created_at=datetime.now(),
        )
        
        mock_session.scalar.side_effect = [sample_user, existing_member]

        with pytest.raises(HTTPException) as exc_info:
            await can_user_join_organization(
                sample_organization, sample_user, mock_session
            )

        assert exc_info.value.status_code == 409
        assert "convidado" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_existing_active_membership_raises_error(
        self, mock_session, sample_user, sample_organization
    ):
        """Test HTTPException raised when user is already active member."""
        from auth_service.utils.organization_utils import can_user_join_organization

        existing_member = OrganizationMember(
            id=uuid4(),
            organization_id=sample_organization.id,
            user_id=sample_user.id,
            status=MemberStatus.ACTIVE,
            created_at=datetime.now(),
        )
        
        mock_session.scalar.side_effect = [sample_user, existing_member]

        with pytest.raises(HTTPException) as exc_info:
            await can_user_join_organization(
                sample_organization, sample_user, mock_session
            )

        assert exc_info.value.status_code == 409
        assert "membro" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_via_link_not_allowed_raises_error(
        self, mock_session, sample_user, sample_organization
    ):
        """Test HTTPException raised when join via link is not allowed."""
        from auth_service.utils.organization_utils import can_user_join_organization

        # Organization only allows REQUEST_ONLY (no link)
        sample_organization.join_policy = OrganizationJoinPolicy.REQUEST_ONLY
        mock_session.scalar.side_effect = [sample_user, None]  # Active user, no existing membership

        with pytest.raises(HTTPException) as exc_info:
            await can_user_join_organization(
                sample_organization, sample_user, mock_session, via_link=True
            )

        assert exc_info.value.status_code == 403
        assert "link não é permitida" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_request_not_allowed_raises_error(
        self, mock_session, sample_user, sample_organization
    ):
        """Test HTTPException raised when join via request is not allowed."""
        from auth_service.utils.organization_utils import can_user_join_organization

        # Organization only allows LINK_ONLY (no request)
        sample_organization.join_policy = OrganizationJoinPolicy.LINK_ONLY
        mock_session.scalar.side_effect = [sample_user, None]  # Active user, no existing membership

        with pytest.raises(HTTPException) as exc_info:
            await can_user_join_organization(
                sample_organization, sample_user, mock_session, via_link=False
            )

        assert exc_info.value.status_code == 403
        assert "não aceita solicitações" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_request_allowed_success(
        self, mock_session, sample_user, sample_organization
    ):
        """Test successful validation when request is allowed."""
        from auth_service.utils.organization_utils import can_user_join_organization

        sample_organization.join_policy = OrganizationJoinPolicy.REQUEST_ONLY
        mock_session.scalar.side_effect = [sample_user, None]  # Active user, no existing membership

        # Should not raise any exception
        await can_user_join_organization(
            sample_organization, sample_user, mock_session, via_link=False
        )

    @pytest.mark.asyncio
    async def test_via_link_allowed_success(
        self, mock_session, sample_user, sample_organization
    ):
        """Test successful validation when join via link is allowed."""
        from auth_service.utils.organization_utils import can_user_join_organization

        sample_organization.join_policy = OrganizationJoinPolicy.LINK_ONLY
        mock_session.scalar.side_effect = [sample_user, None]  # Active user, no existing membership

        # Should not raise any exception
        await can_user_join_organization(
            sample_organization, sample_user, mock_session, via_link=True
        )

    @pytest.mark.asyncio
    async def test_all_policy_allows_both(
        self, mock_session, sample_user, sample_organization
    ):
        """Test ALL policy allows both request and link."""
        from auth_service.utils.organization_utils import can_user_join_organization

        sample_organization.join_policy = OrganizationJoinPolicy.ALL
        
        # Test request
        mock_session.scalar.side_effect = [sample_user, None]
        await can_user_join_organization(
            sample_organization, sample_user, mock_session, via_link=False
        )

        # Test link
        mock_session.scalar.side_effect = [sample_user, None]
        await can_user_join_organization(
            sample_organization, sample_user, mock_session, via_link=True
        )


class TestUploadImage:
    """Tests for upload_image utility function."""

    @pytest.fixture
    def mock_upload_file(self):
        """Create a mock UploadFile."""
        from io import BytesIO
        mock_file = MagicMock()
        mock_file.filename = "test_image.jpg"
        mock_file.content_type = "image/jpeg"
        
        # Mock file.file with proper seek/tell behavior
        fake_content = b"fake image data" * 100  # ~1.5KB
        file_obj = BytesIO(fake_content)
        mock_file.file = file_obj
        return mock_file

    def test_upload_image_success(self, mock_upload_file):
        """Test successful image upload."""
        with patch("auth_service.utils.upload_image.boto3") as mock_boto3:
            with patch("auth_service.utils.upload_image.upload_file") as mock_upload_file_fn:
                mock_s3_client = MagicMock()
                mock_boto3.client.return_value = mock_s3_client
                mock_s3_client.list_objects_v2.return_value = {}
                mock_upload_file_fn.return_value = {"url": "https://test-bucket.s3.amazonaws.com/test.jpg"}

                from auth_service.utils.upload_image import upload_image

                result = upload_image(
                    file=mock_upload_file,
                    organization_id="test-org-123",
                    aws_access_key_id="test-key",
                    aws_secret_access_key="test-secret",
                    aws_region="us-east-1",
                    aws_bucket="test-bucket",
                    prefix="organizations",
                )

                assert "url" in result

    def test_upload_image_invalid_content_type(self):
        """Test upload_image raises AvatarUploadError for invalid content type."""
        from io import BytesIO
        from auth_service.core.exceptions.user import AvatarUploadError
        
        mock_file = MagicMock()
        mock_file.filename = "test_file.txt"
        mock_file.content_type = "text/plain"
        mock_file.file = BytesIO(b"text content")

        with pytest.raises(AvatarUploadError) as exc_info:
            from auth_service.utils.upload_image import upload_image

            upload_image(
                file=mock_file,
                organization_id="test-org-123",
                aws_access_key_id="test-key",
                aws_secret_access_key="test-secret",
                aws_region="us-east-1",
                aws_bucket="test-bucket",
                prefix="organizations",
            )

        assert "Tipo de arquivo não permitido" in str(exc_info.value)

    def test_upload_image_both_ids_raises_error(self):
        """Test upload_image raises AvatarUploadError when both user_id and organization_id are provided."""
        from io import BytesIO
        from auth_service.core.exceptions.user import AvatarUploadError
        
        mock_file = MagicMock()
        mock_file.filename = "test_image.jpg"
        mock_file.content_type = "image/jpeg"
        mock_file.file = BytesIO(b"fake image")

        with pytest.raises(AvatarUploadError) as exc_info:
            from auth_service.utils.upload_image import upload_image

            upload_image(
                file=mock_file,
                user_id="user-123",
                organization_id="org-123",
                aws_access_key_id="test-key",
                aws_secret_access_key="test-secret",
                aws_region="us-east-1",
                aws_bucket="test-bucket",
                prefix="users",
            )

        assert "apenas user_id ou organization_id" in str(exc_info.value)

    def test_upload_image_file_too_large(self):
        """Test upload_image raises AvatarUploadError when file is too large."""
        from io import BytesIO
        from auth_service.core.exceptions.user import AvatarUploadError
        
        mock_file = MagicMock()
        mock_file.filename = "test_image.jpg"
        mock_file.content_type = "image/jpeg"
        # Create a file larger than 5MB
        large_content = b"x" * (6 * 1024 * 1024)  # 6MB
        mock_file.file = BytesIO(large_content)

        with pytest.raises(AvatarUploadError) as exc_info:
            from auth_service.utils.upload_image import upload_image

            upload_image(
                file=mock_file,
                organization_id="org-123",
                aws_access_key_id="test-key",
                aws_secret_access_key="test-secret",
                aws_region="us-east-1",
                aws_bucket="test-bucket",
                prefix="organizations",
            )

        assert "Máximo: 5MB" in str(exc_info.value)

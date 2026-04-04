"""Unit tests for external services (KeycloakAdminService and MailService)."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, BackgroundTasks


class TestKeycloakAdminService:
    """Tests for KeycloakAdminService."""

    @pytest.fixture
    def mock_keycloak_admin(self):
        """Create a mock KeycloakAdmin client."""
        return MagicMock()

    @pytest.mark.asyncio
    async def test_check_username_exists_true(self, mock_keycloak_admin):
        """Test check_username_exists returns True when user exists."""
        from auth_service.infrastructure.external.keycloak_service import (
            KeycloakAdminService,
        )

        mock_keycloak_admin.get_users.return_value = [{"id": "user-123"}]

        with patch(
            "auth_service.infrastructure.external.keycloak_service.get_keycloak_admin_client",
            return_value=mock_keycloak_admin,
        ):
            service = KeycloakAdminService()
            result = await service.check_username_exists("testuser")

            assert result is True

    @pytest.mark.asyncio
    async def test_check_username_exists_false(self, mock_keycloak_admin):
        """Test check_username_exists returns False when user doesn't exist."""
        from auth_service.infrastructure.external.keycloak_service import (
            KeycloakAdminService,
        )

        mock_keycloak_admin.get_users.return_value = []

        with patch(
            "auth_service.infrastructure.external.keycloak_service.get_keycloak_admin_client",
            return_value=mock_keycloak_admin,
        ):
            service = KeycloakAdminService()
            result = await service.check_username_exists("testuser")

            assert result is False

    @pytest.mark.asyncio
    async def test_check_username_exists_exclude_keycloak_id(self, mock_keycloak_admin):
        """Test check_username_exists with exclude_keycloak_id."""
        from auth_service.infrastructure.external.keycloak_service import (
            KeycloakAdminService,
        )

        mock_keycloak_admin.get_users.return_value = [{"id": "user-123"}]

        with patch(
            "auth_service.infrastructure.external.keycloak_service.get_keycloak_admin_client",
            return_value=mock_keycloak_admin,
        ):
            service = KeycloakAdminService()
            # Exclude the same ID - should return False
            result = await service.check_username_exists("testuser", "user-123")
            assert result is False

            # Different ID - should return True
            result = await service.check_username_exists("testuser", "other-id")
            assert result is True

    @pytest.mark.asyncio
    async def test_update_user(self, mock_keycloak_admin):
        """Test update_user calls keycloak admin."""
        from auth_service.infrastructure.external.keycloak_service import (
            KeycloakAdminService,
        )

        with patch(
            "auth_service.infrastructure.external.keycloak_service.get_keycloak_admin_client",
            return_value=mock_keycloak_admin,
        ):
            service = KeycloakAdminService()
            await service.update_user("user-123", {"firstName": "Test"})

            mock_keycloak_admin.update_user.assert_called_once_with(
                "user-123", {"firstName": "Test"}
            )

    @pytest.mark.asyncio
    async def test_get_user(self, mock_keycloak_admin):
        """Test get_user delegates to Keycloak admin."""
        from auth_service.infrastructure.external.keycloak_service import (
            KeycloakAdminService,
        )

        mock_keycloak_admin.get_user.return_value = {
            "id": "user-123",
            "email": "a@b.com",
        }

        with patch(
            "auth_service.infrastructure.external.keycloak_service.get_keycloak_admin_client",
            return_value=mock_keycloak_admin,
        ):
            service = KeycloakAdminService()
            result = await service.get_user("user-123")

            assert result["id"] == "user-123"
            mock_keycloak_admin.get_user.assert_called_once_with("user-123")

    @pytest.mark.asyncio
    async def test_get_users_by_email(self, mock_keycloak_admin):
        """Test get_users_by_email."""
        from auth_service.infrastructure.external.keycloak_service import (
            KeycloakAdminService,
        )

        mock_keycloak_admin.get_users.return_value = [{"id": "user-123", "email": "test@test.com"}]

        with patch(
            "auth_service.infrastructure.external.keycloak_service.get_keycloak_admin_client",
            return_value=mock_keycloak_admin,
        ):
            service = KeycloakAdminService()
            result = await service.get_users_by_email("test@test.com")

            assert len(result) == 1
            assert result[0]["email"] == "test@test.com"

    @pytest.mark.asyncio
    async def test_get_users_by_username(self, mock_keycloak_admin):
        """Test get_users_by_username."""
        from auth_service.infrastructure.external.keycloak_service import (
            KeycloakAdminService,
        )

        mock_keycloak_admin.get_users.return_value = [{"id": "user-123", "username": "testuser"}]

        with patch(
            "auth_service.infrastructure.external.keycloak_service.get_keycloak_admin_client",
            return_value=mock_keycloak_admin,
        ):
            service = KeycloakAdminService()
            result = await service.get_users_by_username("testuser")

            assert len(result) == 1
            assert result[0]["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_create_user(self, mock_keycloak_admin):
        """Test create_user returns user ID."""
        from auth_service.infrastructure.external.keycloak_service import (
            KeycloakAdminService,
        )

        mock_keycloak_admin.create_user.return_value = "new-user-123"

        with patch(
            "auth_service.infrastructure.external.keycloak_service.get_keycloak_admin_client",
            return_value=mock_keycloak_admin,
        ):
            service = KeycloakAdminService()
            result = await service.create_user({"username": "newuser"})

            assert result == "new-user-123"


class TestMailService:
    """Tests for MailService."""

    @pytest.fixture
    def mock_resend(self):
        """Create a mock resend client."""
        with patch("auth_service.infrastructure.external.email_service.resend") as mock:
            yield mock

    @pytest.fixture
    def mock_template_env(self):
        """Create a mock template environment."""
        mock_template = MagicMock()
        mock_template.render.return_value = "<html>Test</html>"
        
        mock_env = MagicMock()
        mock_env.get_template.return_value = mock_template
        return mock_env

    def test_render_template_success(self, mock_template_env):
        """Test render_template successfully renders a template."""
        from auth_service.infrastructure.external.email_service import MailService

        with patch.object(MailService, "env", mock_template_env):
            result = MailService.render_template("test.html", {"key": "value"})
            
            assert result == "<html>Test</html>"
            mock_template_env.get_template.assert_called_once_with("test.html")

    def test_render_template_error(self, mock_template_env):
        """Test render_template raises HTTPException on error."""
        from auth_service.infrastructure.external.email_service import MailService

        mock_template_env.get_template.side_effect = Exception("Template not found")

        with patch.object(MailService, "env", mock_template_env):
            with pytest.raises(HTTPException) as exc_info:
                MailService.render_template("nonexistent.html", {})

            assert exc_info.value.status_code == 500

    def test_send_email_success(self, mock_resend, mock_template_env):
        """Test send_email successfully sends email."""
        from auth_service.infrastructure.external.email_service import MailService

        mock_resend.Emails.send.return_value = {"id": "email-123"}

        with patch.object(MailService, "env", mock_template_env):
            result = MailService.send_email(
                "test@test.com", "Subject", "test.html", {"key": "value"}
            )

            assert result == {"id": "email-123"}

    def test_send_email_resend_error(self, mock_resend, mock_template_env):
        """Test send_email raises HTTPException on Resend error."""
        from auth_service.infrastructure.external.email_service import MailService

        mock_resend.Emails.send.return_value = {"error": "API error"}

        with patch.object(MailService, "env", mock_template_env):
            with pytest.raises(HTTPException) as exc_info:
                MailService.send_email(
                    "test@test.com", "Subject", "test.html", {"key": "value"}
                )

            assert exc_info.value.status_code == 500

    def test_send_email_exception(self, mock_resend, mock_template_env):
        """Test send_email raises HTTPException on exception."""
        from auth_service.infrastructure.external.email_service import MailService

        mock_resend.Emails.send.side_effect = Exception("Network error")

        with patch.object(MailService, "env", mock_template_env):
            with pytest.raises(HTTPException) as exc_info:
                MailService.send_email(
                    "test@test.com", "Subject", "test.html", {"key": "value"}
                )

            assert exc_info.value.status_code == 500

    def test_send_email_background(self, mock_template_env):
        """Test send_email_background adds task to background."""
        from auth_service.infrastructure.external.email_service import MailService

        mock_background = MagicMock(spec=BackgroundTasks)

        with patch.object(MailService, "env", mock_template_env):
            MailService.send_email_background(
                mock_background, "test@test.com", "Subject", "test.html", {"key": "value"}
            )

            mock_background.add_task.assert_called_once()

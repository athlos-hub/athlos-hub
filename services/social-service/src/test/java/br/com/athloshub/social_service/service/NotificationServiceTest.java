package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.client.NotificationServiceClient;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import br.com.athloshub.social_service.enums.NotificationType;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock NotificationServiceClient notificationServiceClient;
    @Mock AuthServiceClient authServiceClient;

    @InjectMocks NotificationService service;

    String recipientKc;
    String actorKc;

    @BeforeEach
    void setup() {
        recipientKc = "kc-recipient";
        actorKc = "kc-actor";
    }

    @Test
    void createNotification_whenRecipientEqualsActor_shouldSkip_andNotCallClients() {
        service.createNotification(
                "kc-same",
                "kc-same",
                NotificationType.POST_LIKE,
                UUID.randomUUID(),
                "post",
                "curtiu"
        );

        verifyNoInteractions(jwtTokenProvider);
        verifyNoInteractions(authServiceClient);
        verifyNoInteractions(notificationServiceClient);
    }

    @Test
    void createNotification_whenNoToken_shouldNotSendNotification() {
        when(jwtTokenProvider.getCurrentToken()).thenReturn(null);

        service.createNotification(
                recipientKc,
                actorKc,
                NotificationType.POST_LIKE,
                UUID.randomUUID(),
                "post",
                "curtiu",
                new HashMap<>()
        );

        verify(jwtTokenProvider).getCurrentToken();
        verifyNoInteractions(authServiceClient);
        verifyNoInteractions(notificationServiceClient);
    }

    @Test
    void createNotification_whenAuthServiceReturnsNullRecipient_shouldNotSendNotification() {
        when(jwtTokenProvider.getCurrentToken()).thenReturn("token");
        when(authServiceClient.getUserByKeycloakId(eq(recipientKc), anyString())).thenReturn(null);

        service.createNotification(
                recipientKc,
                actorKc,
                NotificationType.POST_LIKE,
                UUID.randomUUID(),
                "post",
                "curtiu",
                new HashMap<>()
        );

        verify(authServiceClient).getUserByKeycloakId(eq(recipientKc), eq("Bearer token"));
        verifyNoInteractions(notificationServiceClient);
    }

    @Test
    void createNotification_whenAuthServiceThrows_shouldNotSendNotification() {
        when(jwtTokenProvider.getCurrentToken()).thenReturn("token");
        when(authServiceClient.getUserByKeycloakId(eq(recipientKc), anyString()))
                .thenThrow(new RuntimeException("boom"));

        service.createNotification(
                recipientKc,
                actorKc,
                NotificationType.POST_LIKE,
                UUID.randomUUID(),
                "post",
                "curtiu",
                new HashMap<>()
        );

        verify(authServiceClient).getUserByKeycloakId(eq(recipientKc), eq("Bearer token"));
        verifyNoInteractions(notificationServiceClient);
    }

    @Test
    void createNotification_whenRecipientHasNoId_shouldNotSendNotification() {
        when(jwtTokenProvider.getCurrentToken()).thenReturn("token");

        UserDTO recipient = mock(UserDTO.class);
        when(recipient.getId()).thenReturn(null);
        when(authServiceClient.getUserByKeycloakId(eq(recipientKc), anyString())).thenReturn(recipient);

        service.createNotification(
                recipientKc,
                actorKc,
                NotificationType.POST_LIKE,
                UUID.randomUUID(),
                "post",
                "curtiu",
                new HashMap<>()
        );

        verifyNoInteractions(notificationServiceClient);
    }

    @Test
    void createNotification_whenRecipientIdResolved_shouldSendNotification_withFormattedTitleAndBody() {
        when(jwtTokenProvider.getCurrentToken()).thenReturn("token");

        UserDTO recipient = mock(UserDTO.class);
        UUID recipientUserId = UUID.randomUUID();
        when(recipient.getId()).thenReturn(recipientUserId);
        when(authServiceClient.getUserByKeycloakId(eq(recipientKc), anyString())).thenReturn(recipient);

        Map<String, Object> data = new HashMap<>();
        data.put("actorName", "Valéria");
        data.put("postContent", "um post bem legal");

        UUID entityId = UUID.randomUUID();

        service.createNotification(
                recipientKc,
                actorKc,
                NotificationType.POST_LIKE,
                entityId,
                "post",
                "curtiu seu post",
                data
        );

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> mapCaptor = ArgumentCaptor.forClass(Map.class);

        verify(notificationServiceClient).sendNotification(
                eq(recipientUserId.toString()),
                eq(actorKc),
                eq(NotificationType.POST_LIKE.name()),
                eq(entityId.toString()),
                eq("curtiu seu post"),
                mapCaptor.capture()
        );

        Map<String, Object> sent = mapCaptor.getValue();
        assertThat(sent).containsKeys("title", "body");
        assertThat((String) sent.get("title")).contains("Valéria");
        assertThat((String) sent.get("body")).contains("Valéria");
    }

    @Test
    void createNotification_whenEntityIdIsNull_shouldSendNotification_withNullEntityId() {
        when(jwtTokenProvider.getCurrentToken()).thenReturn("token");

        UserDTO recipient = mock(UserDTO.class);
        UUID recipientUserId = UUID.randomUUID();
        when(recipient.getId()).thenReturn(recipientUserId);
        when(authServiceClient.getUserByKeycloakId(eq(recipientKc), anyString())).thenReturn(recipient);

        Map<String, Object> data = new HashMap<>();
        data.put("actorName", "Valéria");

        service.createNotification(
                recipientKc,
                actorKc,
                NotificationType.FOLLOW,
                null,
                "follow",
                "começou a seguir você",
                data
        );

        verify(notificationServiceClient).sendNotification(
                eq(recipientUserId.toString()),
                eq(actorKc),
                eq(NotificationType.FOLLOW.name()),
                isNull(),
                eq("começou a seguir você"),
                anyMap()
        );
    }

    @Test
    void createNotification_whenAdditionalDataIsNull_shouldStillSend_withGeneratedTitleAndBody() {
        when(jwtTokenProvider.getCurrentToken()).thenReturn("token");

        UserDTO recipient = mock(UserDTO.class);
        UUID recipientUserId = UUID.randomUUID();
        when(recipient.getId()).thenReturn(recipientUserId);
        when(authServiceClient.getUserByKeycloakId(eq(recipientKc), anyString())).thenReturn(recipient);

        service.createNotification(
                recipientKc,
                actorKc,
                NotificationType.FOLLOW,
                null,
                "follow",
                "começou a seguir você",
                null
        );

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> mapCaptor = ArgumentCaptor.forClass(Map.class);

        verify(notificationServiceClient).sendNotification(
                eq(recipientUserId.toString()),
                eq(actorKc),
                eq(NotificationType.FOLLOW.name()),
                isNull(),
                eq("começou a seguir você"),
                mapCaptor.capture()
        );

        Map<String, Object> sent = mapCaptor.getValue();
        assertThat(sent).containsKeys("title", "body");
    }

    @Test
    void createNotification_whenNotificationClientThrows_shouldNotThrow() {
        when(jwtTokenProvider.getCurrentToken()).thenReturn("token");

        UserDTO recipient = mock(UserDTO.class);
        UUID recipientUserId = UUID.randomUUID();
        when(recipient.getId()).thenReturn(recipientUserId);
        when(authServiceClient.getUserByKeycloakId(eq(recipientKc), anyString())).thenReturn(recipient);

        doThrow(new RuntimeException("fail")).when(notificationServiceClient).sendNotification(
                anyString(), anyString(), anyString(), any(), anyString(), anyMap()
        );

        Map<String, Object> data = new HashMap<>();
        data.put("actorName", "Valéria");

        assertThatCode(() -> service.createNotification(
                recipientKc,
                actorKc,
                NotificationType.FOLLOW,
                null,
                "follow",
                "começou a seguir você",
                data
        )).doesNotThrowAnyException();
    }
}

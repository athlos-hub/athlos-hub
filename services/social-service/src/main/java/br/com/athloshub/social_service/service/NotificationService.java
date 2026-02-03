package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.client.NotificationServiceClient;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import br.com.athloshub.social_service.enums.NotificationType;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationServiceClient notificationServiceClient;
    private final AuthServiceClient authServiceClient;
    
    @Transactional
    public void createNotification(
        String recipientKeycloakId,
        String actorKeycloakId,
        NotificationType type,
        UUID entityId,
        String entityType,
        String message
    ) {
        createNotification(recipientKeycloakId, actorKeycloakId, type, entityId, entityType, message, null);
    }
    
    @Transactional
    public void createNotification(
        String recipientKeycloakId,
        String actorKeycloakId,
        NotificationType type,
        UUID entityId,
        String entityType,
        String message,
        java.util.Map<String, Object> additionalData
    ) {
        if (recipientKeycloakId.equals(actorKeycloakId)) {
            log.debug("Skipping self-notification for user: {}", recipientKeycloakId);
            return;
        }
        
        String recipientUserId = null;
        try {
            String token = jwtTokenProvider.getCurrentToken();
            if (token != null) {
                UserDTO recipient = authServiceClient.getUserByKeycloakId(recipientKeycloakId, "Bearer " + token);
                if (recipient != null && recipient.getId() != null) {
                    recipientUserId = recipient.getId().toString();
                    log.debug("User ID encontrado para keycloak_id {}: {}", recipientKeycloakId, recipientUserId);
                }
            }
        } catch (Exception e) {
            log.error("Erro ao buscar user_id do auth-service para keycloak_id {}: {}", recipientKeycloakId, e.getMessage());
        }
        
        if (recipientUserId == null) {
            log.warn("Não foi possível enviar notificação: user_id não encontrado para keycloak_id {}", recipientKeycloakId);
            return;
        }
        
        if (additionalData == null) {
            additionalData = new java.util.HashMap<>();
        }
        
        String title = formatNotificationTitle(type, additionalData);
        String body = formatNotificationBody(type, message, additionalData);
        
        additionalData.put("title", title);
        additionalData.put("body", body);
        
        try {
            notificationServiceClient.sendNotification(
                recipientUserId,
                actorKeycloakId,
                type.name(),
                entityId != null ? entityId.toString() : null,
                message,
                additionalData
            );
        } catch (Exception e) {
            log.error("Erro ao enviar notificação para o serviço de notificações", e);
        }
    }
    
    private String formatNotificationTitle(NotificationType type, java.util.Map<String, Object> data) {
        String actorName = (String) data.getOrDefault("actorName", "Alguém");
        String organizationName = (String) data.get("organizationName");
        
        switch (type) {
            case POST_LIKE:
                return actorName + " curtiu seu post";
            case POST_COMMENT:
                return actorName + " comentou no seu post";
            case POST_SHARE:
                return actorName + " compartilhou seu post";
            case FOLLOW:
                return actorName + " começou a seguir você";
            case ORGANIZATION_FOLLOW:
                return actorName + " começou a seguir " + (organizationName != null ? organizationName : "a organização");
            default:
                return actorName + " interagiu com você";
        }
    }
    
    private String formatNotificationBody(NotificationType type, String message, java.util.Map<String, Object> data) {
        String actorName = (String) data.getOrDefault("actorName", "Alguém");
        String postContent = (String) data.get("postContent");
        String commentContent = (String) data.get("commentContent");
        String shareComment = (String) data.get("shareComment");
        String organizationName = (String) data.get("organizationName");
        
        switch (type) {
            case POST_LIKE:
                if (postContent != null && !postContent.isEmpty()) {
                    return actorName + " curtiu seu post: \"" + truncate(postContent, 100) + "\"";
                }
                return actorName + " curtiu seu post";
                
            case POST_COMMENT:
                if (commentContent != null && !commentContent.isEmpty()) {
                    return actorName + ": \"" + truncate(commentContent, 150) + "\"";
                }
                return actorName + " comentou no seu post";
                
            case POST_SHARE:
                if (shareComment != null && !shareComment.isEmpty()) {
                    return actorName + " compartilhou com comentário: \"" + truncate(shareComment, 150) + "\"";
                } else if (postContent != null && !postContent.isEmpty()) {
                    return actorName + " compartilhou seu post: \"" + truncate(postContent, 100) + "\"";
                }
                return actorName + " compartilhou seu post";
                
            case FOLLOW:
                return actorName + " agora está seguindo você!";
                
            case ORGANIZATION_FOLLOW:
                return actorName + " agora está seguindo a organização " + (organizationName != null ? organizationName : "");
                
            default:
                return message;
        }
    }
    
    private String truncate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...";
    }
}

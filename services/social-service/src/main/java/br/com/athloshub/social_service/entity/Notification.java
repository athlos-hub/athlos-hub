package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notifications_recipient", columnList = "recipient_keycloak_id"),
    @Index(name = "idx_notifications_read", columnList = "is_read"),
    @Index(name = "idx_notifications_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification extends BaseEntity {
    
    public enum NotificationType {
        POST_LIKE,
        POST_COMMENT,
        POST_SHARE,
        COMMENT_REPLY,
        FOLLOW,
        ORGANIZATION_FOLLOW
    }
    
    @Column(name = "recipient_keycloak_id", nullable = false)
    private String recipientKeycloakId;
    
    @Column(name = "actor_keycloak_id", nullable = false)
    private String actorKeycloakId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;
    
    @Column(name = "entity_id")
    private UUID entityId;
    
    @Column(name = "entity_type")
    private String entityType;
    
    @Column(columnDefinition = "TEXT")
    private String message;
    
    @Column(name = "is_read", nullable = false)
    private boolean read = false;
    
    @Column(name = "read_at")
    private java.time.LocalDateTime readAt;
}

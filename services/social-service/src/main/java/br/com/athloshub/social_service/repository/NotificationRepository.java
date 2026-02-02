package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    
    Page<Notification> findByRecipientKeycloakIdOrderByCreatedAtDesc(
        String recipientKeycloakId, 
        Pageable pageable
    );
    
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipientKeycloakId = :keycloakId AND n.read = false")
    long countUnreadByRecipientKeycloakId(@Param("keycloakId") String keycloakId);
    
    @Modifying
    @Query("UPDATE Notification n SET n.read = true, n.readAt = CURRENT_TIMESTAMP WHERE n.recipientKeycloakId = :keycloakId AND n.read = false")
    int markAllAsReadByRecipientKeycloakId(@Param("keycloakId") String keycloakId);
    
    @Modifying
    @Query("UPDATE Notification n SET n.read = true, n.readAt = CURRENT_TIMESTAMP WHERE n.id = :id AND n.recipientKeycloakId = :keycloakId")
    int markAsReadById(@Param("id") UUID id, @Param("keycloakId") String keycloakId);
    
    void deleteByRecipientKeycloakId(String recipientKeycloakId);
}

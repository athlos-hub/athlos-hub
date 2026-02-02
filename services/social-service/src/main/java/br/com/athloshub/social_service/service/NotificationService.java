package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Notification;
import br.com.athloshub.social_service.repository.NotificationRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
    @Transactional
    public Notification createNotification(
        String recipientKeycloakId,
        String actorKeycloakId,
        Notification.NotificationType type,
        UUID entityId,
        String entityType,
        String message
    ) {
        if (recipientKeycloakId.equals(actorKeycloakId)) {
            log.debug("Skipping self-notification for user: {}", recipientKeycloakId);
            return null;
        }
        
        Notification notification = Notification.builder()
            .recipientKeycloakId(recipientKeycloakId)
            .actorKeycloakId(actorKeycloakId)
            .type(type)
            .entityId(entityId)
            .entityType(entityType)
            .message(message)
            .read(false)
            .build();
        
        return notificationRepository.save(notification);
    }
    
    @Transactional(readOnly = true)
    public Page<Notification> getMyNotifications(Pageable pageable) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        return notificationRepository.findByRecipientKeycloakIdOrderByCreatedAtDesc(keycloakId, pageable);
    }
    
    @Transactional(readOnly = true)
    public long getUnreadCount() {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        return notificationRepository.countUnreadByRecipientKeycloakId(keycloakId);
    }
    
    @Transactional
    public void markAsRead(UUID notificationId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        int updated = notificationRepository.markAsReadById(notificationId, keycloakId);
        if (updated == 0) {
            throw new ResponseStatusException(NOT_FOUND, "Notificação não encontrada");
        }
    }
    
    @Transactional
    public void markAllAsRead() {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        notificationRepository.markAllAsReadByRecipientKeycloakId(keycloakId);
    }
    
    @Transactional
    public void deleteNotification(UUID notificationId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Notificação não encontrada"));
        
        if (!notification.getRecipientKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Você não tem permissão para deletar esta notificação");
        }
        
        notificationRepository.delete(notification);
    }
}

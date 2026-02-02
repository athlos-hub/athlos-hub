package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Like;
import br.com.athloshub.social_service.entity.Notification;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.repository.LikeRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LikeService {
    
    private final LikeRepository likeRepository;
    private final PostRepository postRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationService notificationService;
    
    @Transactional
    public boolean toggleLike(UUID postId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        log.debug("Toggle like - keycloakId: {}, postId: {}", keycloakId, postId);
        
        if (keycloakId == null) {
            log.warn("User not authenticated - keycloakId is null");
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Post não encontrado"));
        
        log.debug("Post found: {}", post.getId());
        
        boolean isLiked = likeRepository.findByKeycloakIdAndPostId(keycloakId, postId)
            .map(existingLike -> {
                log.debug("Removing existing like: {}", existingLike.getId());
                likeRepository.delete(existingLike);
                post.setLikesCount(Math.max(0, post.getLikesCount() - 1));
                postRepository.save(post);
                return false;
            })
            .orElseGet(() -> {
                log.debug("Creating new like for keycloakId: {} on postId: {}", keycloakId, postId);
                Like newLike = Like.builder()
                    .keycloakId(keycloakId)
                    .post(post)
                    .build();
                Like saved = likeRepository.save(newLike);
                log.debug("Like saved with id: {}", saved.getId());
                post.setLikesCount(post.getLikesCount() + 1);
                postRepository.save(post);
                
                try {
                    notificationService.createNotification(
                        post.getCreatedByKeycloakId(),
                        keycloakId,
                        Notification.NotificationType.POST_LIKE,
                        post.getId(),
                        "post",
                        "curtiu seu post"
                    );
                } catch (Exception e) {
                    log.error("Erro ao criar notificação de like", e);
                }
                
                return true;
            });
        
        log.debug("Toggle like result - isLiked: {}, likesCount: {}", isLiked, post.getLikesCount());
        return isLiked;
    }
    
    @Transactional(readOnly = true)
    public boolean isLikedByCurrentUser(UUID postId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            return false;
        }
        return likeRepository.existsByKeycloakIdAndPostId(keycloakId, postId);
    }
    
    @Transactional(readOnly = true)
    public long getLikesCount(UUID postId) {
        return likeRepository.countByPostId(postId);
    }
}

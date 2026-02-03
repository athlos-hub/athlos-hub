package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.enums.NotificationType;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.entity.Share;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.repository.ShareRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShareService {
    
    private final ShareRepository shareRepository;
    private final PostRepository postRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationService notificationService;
    
    @Transactional
    public Share sharePost(UUID postId, String comment) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Post não encontrado"));
        
        if (shareRepository.existsByKeycloakIdAndPostId(keycloakId, postId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Você já compartilhou este post");
        }
        
        Share share = Share.builder()
            .keycloakId(keycloakId)
            .post(post)
            .comment(comment)
            .build();
        
        Share savedShare = shareRepository.save(share);
        
        post.setSharesCount(post.getSharesCount() + 1);
        postRepository.save(post);
        
        try {
            java.util.Map<String, Object> notificationData = new java.util.HashMap<>();
            notificationData.put("actorName", "Usuário");
            notificationData.put("postContent", post.getContent());
            notificationData.put("postUrl", "https://athlos-hub.com/social/post/" + post.getId());
            notificationData.put("actionUrl", "https://athlos-hub.com/social/post/" + post.getId());
            if (comment != null && !comment.isEmpty()) {
                notificationData.put("shareComment", comment);
            }
            
            notificationService.createNotification(
                post.getCreatedByKeycloakId(),
                keycloakId,
                NotificationType.POST_SHARE,
                post.getId(),
                "post",
                "compartilhou seu post",
                notificationData
            );
        } catch (Exception e) {
            log.error("Erro ao criar notificação de compartilhamento", e);
        }
        
        return savedShare;
    }
    
    @Transactional
    public void unsharePost(UUID postId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        Share share = shareRepository.findByKeycloakIdAndPostId(keycloakId, postId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Compartilhamento não encontrado"));
        
        shareRepository.delete(share);
        
        Post post = share.getPost();
        post.setSharesCount(Math.max(0, post.getSharesCount() - 1));
        postRepository.save(post);
    }
    
    @Transactional(readOnly = true)
    public boolean hasShared(UUID postId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            return false;
        }
        return shareRepository.existsByKeycloakIdAndPostId(keycloakId, postId);
    }
    
    @Transactional(readOnly = true)
    public Page<Share> getMyShares(Pageable pageable) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        return shareRepository.findByKeycloakIdOrderByCreatedAtDesc(keycloakId, pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<Share> getUserShares(String keycloakId, Pageable pageable) {
        return shareRepository.findByKeycloakIdOrderByCreatedAtDesc(keycloakId, pageable);
    }
    
    @Transactional(readOnly = true)
    public long getShareCount(UUID postId) {
        return shareRepository.countByPostId(postId);
    }
}

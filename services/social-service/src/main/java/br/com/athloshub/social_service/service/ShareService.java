package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.entity.Share;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.repository.ShareRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class ShareService {
    
    private final ShareRepository shareRepository;
    private final PostRepository postRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
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

package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Like;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.repository.LikeRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class LikeService {
    
    private final LikeRepository likeRepository;
    private final PostRepository postRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
    @Transactional
    public boolean toggleLike(UUID postId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Post não encontrado"));
        
        boolean isLiked = likeRepository.findByKeycloakIdAndPostId(keycloakId, postId)
            .map(existingLike -> {
                likeRepository.delete(existingLike);
                post.setLikesCount(Math.max(0, post.getLikesCount() - 1));
                postRepository.save(post);
                return false;
            })
            .orElseGet(() -> {
                Like newLike = Like.builder()
                    .keycloakId(keycloakId)
                    .post(post)
                    .build();
                likeRepository.save(newLike);
                post.setLikesCount(post.getLikesCount() + 1);
                postRepository.save(post);
                return true;
            });
        
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

package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.repository.FollowRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class FeedService {
    
    private final PostRepository postRepository;
    private final FollowRepository followRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
    @Transactional(readOnly = true)
    public Page<Post> getMyFeed(Pageable pageable) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        List<String> followingIds = followRepository.findFollowingIdsByKeycloakId(keycloakId);
        followingIds.add(keycloakId);
        
        return postRepository.findByProfileTypeAndProfileIdInOrderByCreatedAtDesc(
            Post.ProfileType.ATHLETE,
            followingIds,
            pageable
        );
    }
    
    @Transactional(readOnly = true)
    public Page<Post> getPublicFeed(Pageable pageable) {
        return postRepository.findPublicPostsOrderByCreatedAtDesc(pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<Post> getFollowingFeed(Pageable pageable) {
        return getMyFeed(pageable);
    }
}

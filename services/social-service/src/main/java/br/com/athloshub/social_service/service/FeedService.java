package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.repository.FollowRepository;
import br.com.athloshub.social_service.repository.OrganizationFollowRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class FeedService {
    
    private final PostRepository postRepository;
    private final FollowRepository followRepository;
    private final OrganizationFollowRepository organizationFollowRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
    @Transactional(readOnly = true)
    public Page<Post> getMyFeed(Pageable pageable) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        // Buscar usuários que sigo
        List<String> followingIds = followRepository.findFollowingIdsByKeycloakId(keycloakId);
        followingIds.add(keycloakId); // Incluir meus próprios posts
        
        // Buscar organizações que sigo
        List<String> followingOrgSlugs = organizationFollowRepository.findOrganizationSlugsByFollowerKeycloakId(keycloakId);
        
        List<Post> allPosts = new ArrayList<>();
        
        // Buscar posts de usuários que sigo
        if (!followingIds.isEmpty()) {
            List<Post> athletePosts = postRepository.findByProfileTypeAndProfileIdInAndVisibilityOrderByCreatedAtDesc(
                Post.ProfileType.ATHLETE,
                followingIds,
                Post.PostVisibility.PUBLIC
            );
            allPosts.addAll(athletePosts);
        }
        
        // Buscar posts de organizações que sigo
        if (!followingOrgSlugs.isEmpty()) {
            List<Post> orgPosts = postRepository.findByProfileTypeAndProfileIdInAndVisibilityOrderByCreatedAtDesc(
                Post.ProfileType.ORGANIZATION,
                followingOrgSlugs,
                Post.PostVisibility.PUBLIC
            );
            allPosts.addAll(orgPosts);
        }
        
        // Ordenar todos os posts por data de criação (mais recente primeiro)
        List<Post> sortedPosts = allPosts.stream()
            .sorted(Comparator.comparing(Post::getCreatedAt).reversed())
            .collect(Collectors.toList());
        
        // Implementar paginação manual
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), sortedPosts.size());
        
        List<Post> pagedPosts = sortedPosts.subList(start, end);
        
        return new PageImpl<>(pagedPosts, pageable, sortedPosts.size());
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

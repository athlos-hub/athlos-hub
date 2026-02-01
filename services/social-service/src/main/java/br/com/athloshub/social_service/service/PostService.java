package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.repository.AthleteProfileRepository;
import br.com.athloshub.social_service.repository.CommentRepository;
import br.com.athloshub.social_service.repository.LikeRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class PostService {
    
    private final PostRepository postRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final AthleteProfileRepository athleteProfileRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
    @Transactional
    public Post createPost(
        String content,
        List<String> mediaUrls,
        Post.PostType type,
        Post.PostVisibility visibility,
        Map<String, Object> metadata
    ) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        Post post = Post.builder()
            .keycloakId(keycloakId)
            .content(content)
            .mediaUrls(mediaUrls)
            .type(type != null ? type : Post.PostType.TEXT)
            .visibility(visibility != null ? visibility : Post.PostVisibility.PUBLIC)
            .metadata(metadata)
            .build();
        
        Post savedPost = postRepository.save(post);
        
        athleteProfileRepository.findByKeycloakId(keycloakId).ifPresent(profile -> {
            profile.setPostsCount(profile.getPostsCount() + 1);
            athleteProfileRepository.save(profile);
        });
        
        return savedPost;
    }
    
    @Transactional(readOnly = true)
    public Post getPostById(UUID postId) {
        return postRepository.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Post não encontrado"));
    }
    
    @Transactional(readOnly = true)
    public Page<Post> getPostsByKeycloakId(String keycloakId, Pageable pageable) {
        return postRepository.findByKeycloakIdOrderByCreatedAtDesc(keycloakId, pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<Post> getMyPosts(Pageable pageable) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        return getPostsByKeycloakId(keycloakId, pageable);
    }
    
    @Transactional
    public Post updatePost(UUID postId, String content, List<String> mediaUrls) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        Post post = getPostById(postId);
        
        if (!post.getKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para editar este post");
        }
        
        if (content != null) post.setContent(content);
        if (mediaUrls != null) post.setMediaUrls(mediaUrls);
        
        return postRepository.save(post);
    }
    
    @Transactional
    public void deletePost(UUID postId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        Post post = getPostById(postId);
        
        if (!post.getKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para deletar este post");
        }
        
        postRepository.delete(post);
        
        athleteProfileRepository.findByKeycloakId(keycloakId).ifPresent(profile -> {
            profile.setPostsCount(Math.max(0, profile.getPostsCount() - 1));
            athleteProfileRepository.save(profile);
        });
    }
}

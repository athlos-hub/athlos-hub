package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.request.CreatePostRequest;
import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import br.com.athloshub.social_service.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/social/athlete/posts")
@RequiredArgsConstructor
public class AthletePostController {
    
    private final PostService postService;
    private final JwtTokenProvider jwtTokenProvider;
    
    @PostMapping
    public ResponseEntity<ApiResponse<Post>> createPost(@Valid @RequestBody CreatePostRequest request) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        Post post = postService.createAthletePost(keycloakId, request);
        return ResponseEntity.ok(ApiResponse.success(post));
    }
    
    @GetMapping("/my-posts")
    public ResponseEntity<ApiResponse<Page<Post>>> getMyPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postService.getAthletePostsByKeycloakId(keycloakId, pageable);
        return ResponseEntity.ok(ApiResponse.success(posts));
    }
    
    @GetMapping("/{keycloakId}")
    public ResponseEntity<ApiResponse<Page<Post>>> getAthletePostsByKeycloakId(
            @PathVariable String keycloakId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postService.getAthletePostsByKeycloakId(keycloakId, pageable);
        return ResponseEntity.ok(ApiResponse.success(posts));
    }
    
    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(@PathVariable UUID postId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        postService.deleteAthletePost(postId, keycloakId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
    
    @PostMapping("/{postId}/share")
    public ResponseEntity<ApiResponse<Post>> sharePost(
            @PathVariable UUID postId,
            @RequestBody(required = false) CreatePostRequest shareRequest) {
        
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        Post sharedPost = postService.sharePost(postId, keycloakId, shareRequest);
        return ResponseEntity.ok(ApiResponse.success(sharedPost));
    }
}

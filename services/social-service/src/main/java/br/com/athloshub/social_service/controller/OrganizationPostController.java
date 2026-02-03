package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.service.PostService;
import br.com.athloshub.social_service.service.ProfileContextService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/social/organizations")
public class OrganizationPostController {

    private final PostService postService;
    private final ProfileContextService profileContextService;

    public OrganizationPostController(
            PostService postService,
            ProfileContextService profileContextService
    ) {
        this.postService = postService;
        this.profileContextService = profileContextService;
    }

    @PostMapping("/{slug}/posts")
    public ResponseEntity<ApiResponse<Post>> createPost(
            @PathVariable String slug,
            @RequestBody Map<String, Object> body
    ) {
        if (!profileContextService.canCreatePostAsOrganization(slug)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Você não tem permissão para criar posts nesta organização"
            );
        }

        String content = (String) body.get("content");
        @SuppressWarnings("unchecked")
        List<String> mediaUrls = (List<String>) body.get("mediaUrls");

        Post.PostType type = body.containsKey("type")
                ? Post.PostType.valueOf((String) body.get("type"))
                : Post.PostType.TEXT;

        Post.PostVisibility visibility = body.containsKey("visibility")
                ? Post.PostVisibility.valueOf((String) body.get("visibility"))
                : Post.PostVisibility.PUBLIC;

        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) body.get("metadata");

        Post post = postService.createOrganizationPost(slug, content, mediaUrls, type, visibility, metadata);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(post));
    }

    @GetMapping("/{slug}/posts")
    public ResponseEntity<ApiResponse<Page<Post>>> getOrganizationPosts(
            @PathVariable String slug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postService.getProfilePosts(Post.ProfileType.ORGANIZATION, slug, pageable);
        return ResponseEntity.ok(ApiResponse.success(posts));
    }

    @DeleteMapping("/{slug}/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable String slug,
            @PathVariable UUID postId
    ) {
        if (!profileContextService.canCreatePostAsOrganization(slug)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Você não tem permissão para deletar posts desta organização"
            );
        }

        postService.deletePost(postId);
        return ResponseEntity.ok(ApiResponse.success(null, "Post deletado com sucesso"));
    }
}

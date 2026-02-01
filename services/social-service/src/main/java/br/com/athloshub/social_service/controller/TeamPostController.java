package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.service.PostService;
import br.com.athloshub.social_service.service.ProfileContextService;
import br.com.athloshub.social_service.service.TeamProfileService;
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
@RequestMapping("/api/social/teams")
public class TeamPostController {
    
    private final PostService postService;
    private final TeamProfileService teamProfileService;
    private final ProfileContextService profileContextService;
    
    public TeamPostController(
        PostService postService,
        TeamProfileService teamProfileService,
        ProfileContextService profileContextService
    ) {
        this.postService = postService;
        this.teamProfileService = teamProfileService;
        this.profileContextService = profileContextService;
    }
    
    @PostMapping("/{teamId}/posts")
    public ResponseEntity<ApiResponse<Post>> createPost(
        @PathVariable String teamId,
        @RequestBody Map<String, Object> body
    ) {
        if (!profileContextService.canCreatePostAsTeam(teamId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não tem permissão para criar posts nesta equipe");
        }
        
        String content = (String) body.get("content");
        @SuppressWarnings("unchecked")
        List<String> mediaUrls = (List<String>) body.get("mediaUrls");
        Post.PostType type = body.containsKey("type") ? 
            Post.PostType.valueOf((String) body.get("type")) : Post.PostType.TEXT;
        Post.PostVisibility visibility = body.containsKey("visibility") ? 
            Post.PostVisibility.valueOf((String) body.get("visibility")) : Post.PostVisibility.PUBLIC;
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) body.get("metadata");
        
        Post post = postService.createTeamPost(teamId, content, mediaUrls, type, visibility, metadata);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(post));
    }
    
    @GetMapping("/{teamId}/posts")
    public ResponseEntity<ApiResponse<Page<Post>>> getTeamPosts(
        @PathVariable String teamId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postService.getProfilePosts(Post.ProfileType.TEAM, teamId, pageable);
        return ResponseEntity.ok(ApiResponse.success(posts));
    }
    
    @DeleteMapping("/{teamId}/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
        @PathVariable String teamId,
        @PathVariable UUID postId
    ) {
        if (!profileContextService.canCreatePostAsTeam(teamId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não tem permissão para deletar posts desta equipe");
        }
        
        postService.deletePost(postId);
        return ResponseEntity.ok(ApiResponse.success(null, "Post deletado com sucesso"));
    }
}

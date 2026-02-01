package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.service.FeedService;
import br.com.athloshub.social_service.service.PostService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/social/feed")
public class FeedController {
    
    private final FeedService feedService;
    private final PostService postService;
    
    public FeedController(FeedService feedService, PostService postService) {
        this.feedService = feedService;
        this.postService = postService;
    }
    
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<Page<Post>>> getPublicFeed(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> feed = postService.getPublicFeed(pageable);
        return ResponseEntity.ok(ApiResponse.success(feed));
    }
    
    @GetMapping("/following")
    public ResponseEntity<ApiResponse<Page<Post>>> getFollowingFeed(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> feed = feedService.getFollowingFeed(pageable);
        return ResponseEntity.ok(ApiResponse.success(feed));
    }
}

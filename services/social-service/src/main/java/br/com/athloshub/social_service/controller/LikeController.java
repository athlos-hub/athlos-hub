package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/social/posts/{postId}/like")
@RequiredArgsConstructor
public class LikeController {
    
    private final LikeService likeService;
    
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleLike(@PathVariable UUID postId) {
        boolean isLiked = likeService.toggleLike(postId);
        long likesCount = likeService.getLikesCount(postId);
        
        Map<String, Object> response = Map.of(
            "isLiked", isLiked,
            "likesCount", likesCount
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLikeStatus(@PathVariable UUID postId) {
        boolean isLiked = likeService.isLikedByCurrentUser(postId);
        long likesCount = likeService.getLikesCount(postId);
        
        Map<String, Object> response = Map.of(
            "isLiked", isLiked,
            "likesCount", likesCount
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

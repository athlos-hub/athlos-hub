package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.Follow;
import br.com.athloshub.social_service.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/social/follow")
@RequiredArgsConstructor
public class FollowController {
    
    private final FollowService followService;
    
    @PostMapping("/{targetKeycloakId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> toggleFollow(
            @PathVariable String targetKeycloakId) {
        boolean isFollowing = followService.toggleFollow(targetKeycloakId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("following", isFollowing)));
    }
    
    @GetMapping("/check/{targetKeycloakId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkFollowing(
            @PathVariable String targetKeycloakId) {
        boolean isFollowing = followService.isFollowing(targetKeycloakId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("following", isFollowing)));
    }
    
    @GetMapping("/followers/{keycloakId}")
    public ResponseEntity<ApiResponse<Page<Follow>>> getFollowers(
            @PathVariable String keycloakId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Follow> followers = followService.getFollowers(keycloakId, pageable);
        return ResponseEntity.ok(ApiResponse.success(followers));
    }
    
    @GetMapping("/following/{keycloakId}")
    public ResponseEntity<ApiResponse<Page<Follow>>> getFollowing(
            @PathVariable String keycloakId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Follow> following = followService.getFollowing(keycloakId, pageable);
        return ResponseEntity.ok(ApiResponse.success(following));
    }
}

package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.Share;
import br.com.athloshub.social_service.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/social/shares")
@RequiredArgsConstructor
public class ShareController {
    
    private final ShareService shareService;
    
    @PostMapping("/{postId}")
    public ResponseEntity<ApiResponse<Share>> sharePost(
            @PathVariable UUID postId,
            @RequestBody(required = false) Map<String, String> body) {
        String comment = body != null ? body.get("comment") : null;
        Share share = shareService.sharePost(postId, comment);
        return ResponseEntity.ok(ApiResponse.success(share));
    }
    
    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> unsharePost(@PathVariable UUID postId) {
        shareService.unsharePost(postId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unshared", true)));
    }
    
    @GetMapping("/check/{postId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkShared(@PathVariable UUID postId) {
        boolean hasShared = shareService.hasShared(postId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("shared", hasShared)));
    }
    
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<Share>>> getMyShares(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Share> shares = shareService.getMyShares(pageable);
        return ResponseEntity.ok(ApiResponse.success(shares));
    }
    
    @GetMapping("/user/{keycloakId}")
    public ResponseEntity<ApiResponse<Page<Share>>> getUserShares(
            @PathVariable String keycloakId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Share> shares = shareService.getUserShares(keycloakId, pageable);
        return ResponseEntity.ok(ApiResponse.success(shares));
    }
    
    @GetMapping("/count/{postId}")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getShareCount(@PathVariable UUID postId) {
        long count = shareService.getShareCount(postId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", count)));
    }
}

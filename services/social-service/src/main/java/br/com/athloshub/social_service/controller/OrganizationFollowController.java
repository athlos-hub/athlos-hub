package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.OrganizationFollow;
import br.com.athloshub.social_service.service.OrganizationFollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/social/organization-follow")
@RequiredArgsConstructor
public class OrganizationFollowController {
    
    private final OrganizationFollowService organizationFollowService;
    
    @PostMapping("/{organizationSlug}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> toggleFollowOrganization(
            @PathVariable String organizationSlug) {
        boolean isFollowing = organizationFollowService.toggleFollowOrganization(organizationSlug);
        return ResponseEntity.ok(ApiResponse.success(Map.of("following", isFollowing)));
    }
    
    @GetMapping("/check/{organizationSlug}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkFollowingOrganization(
            @PathVariable String organizationSlug) {
        boolean isFollowing = organizationFollowService.isFollowingOrganization(organizationSlug);
        return ResponseEntity.ok(ApiResponse.success(Map.of("following", isFollowing)));
    }
    
    @GetMapping("/count/{organizationSlug}")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getOrganizationFollowersCount(
            @PathVariable String organizationSlug) {
        long count = organizationFollowService.getOrganizationFollowersCount(organizationSlug);
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", count)));
    }
    
    @GetMapping("/followers/{organizationSlug}")
    public ResponseEntity<ApiResponse<Page<OrganizationFollow>>> getOrganizationFollowers(
            @PathVariable String organizationSlug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<OrganizationFollow> followers = organizationFollowService.getOrganizationFollowers(organizationSlug, pageable);
        return ResponseEntity.ok(ApiResponse.success(followers));
    }
    
    @GetMapping("/my-organizations")
    public ResponseEntity<ApiResponse<Page<OrganizationFollow>>> getMyFollowedOrganizations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<OrganizationFollow> organizations = organizationFollowService.getMyFollowedOrganizations(pageable);
        return ResponseEntity.ok(ApiResponse.success(organizations));
    }
    
    @GetMapping("/following/{keycloakId}")
    public ResponseEntity<ApiResponse<Page<OrganizationFollow>>> getFollowedOrganizationsByUser(
            @PathVariable String keycloakId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<OrganizationFollow> organizations = organizationFollowService.getFollowedOrganizationsByUser(keycloakId, pageable);
        return ResponseEntity.ok(ApiResponse.success(organizations));
    }
}

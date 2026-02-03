package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.service.ProfileContextService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/social/context")
public class ProfileContextController {
    
    private final ProfileContextService profileContextService;
    
    public ProfileContextController(ProfileContextService profileContextService) {
        this.profileContextService = profileContextService;
    }
    
    @GetMapping("/organizations")
    public ResponseEntity<ApiResponse<List<String>>> getMyOrganizations() {
        List<String> organizationSlugs = profileContextService.getUserOrganizationSlugs();
        return ResponseEntity.ok(ApiResponse.success(organizationSlugs));
    }
    
    @GetMapping("/can-post-as-organization/{slug}")
    public ResponseEntity<ApiResponse<Boolean>> canPostAsOrganization(@PathVariable String slug) {
        boolean canPost = profileContextService.canCreatePostAsOrganization(slug);
        return ResponseEntity.ok(ApiResponse.success(canPost));
    }
    
    @GetMapping("/can-post-as-team/{teamId}")
    public ResponseEntity<ApiResponse<Boolean>> canPostAsTeam(@PathVariable String teamId) {
        boolean canPost = profileContextService.canCreatePostAsTeam(teamId);
        return ResponseEntity.ok(ApiResponse.success(canPost));
    }
}

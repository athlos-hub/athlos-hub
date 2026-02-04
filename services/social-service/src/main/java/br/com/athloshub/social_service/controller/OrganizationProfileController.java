package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.OrganizationProfile;
import br.com.athloshub.social_service.service.OrganizationProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/social/organization-profiles")
public class OrganizationProfileController {
    
    private final OrganizationProfileService organizationProfileService;
    
    public OrganizationProfileController(OrganizationProfileService organizationProfileService) {
        this.organizationProfileService = organizationProfileService;
    }
    
    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<OrganizationProfile>> getOrganizationProfile(@PathVariable String slug) {
        OrganizationProfile profile = organizationProfileService.getOrCreateProfile(slug);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}

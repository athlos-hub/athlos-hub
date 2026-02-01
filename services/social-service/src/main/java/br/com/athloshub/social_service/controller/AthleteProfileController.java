package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.AthleteProfile;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import br.com.athloshub.social_service.service.AthleteProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/social/profile")
public class AthleteProfileController {
    
    private final AthleteProfileService profileService;
    private final JwtTokenProvider jwtTokenProvider;
    
    public AthleteProfileController(AthleteProfileService profileService, JwtTokenProvider jwtTokenProvider) {
        this.profileService = profileService;
        this.jwtTokenProvider = jwtTokenProvider;
    }
    
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AthleteProfile>> getMyProfile() {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        AthleteProfile profile = profileService.getOrCreateProfile(keycloakId);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @GetMapping("/{keycloakId}")
    public ResponseEntity<ApiResponse<AthleteProfile>> getProfileByKeycloakId(@PathVariable String keycloakId) {
        AthleteProfile profile = profileService.getProfileByKeycloakId(keycloakId);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<AthleteProfile>> updateMyProfile(@RequestBody Map<String, Object> updates) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        AthleteProfile profile = profileService.updateProfile(keycloakId, updates);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @PutMapping("/me/bio")
    public ResponseEntity<ApiResponse<AthleteProfile>> updateBio(@RequestBody Map<String, String> body) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        String bio = body.get("bio");
        AthleteProfile profile = profileService.updateBio(keycloakId, bio);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @PutMapping("/me/achievements")
    public ResponseEntity<ApiResponse<AthleteProfile>> updateAchievements(@RequestBody Map<String, Object> achievements) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        AthleteProfile profile = profileService.updateAchievements(keycloakId, achievements);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @PutMapping("/me/statistics")
    public ResponseEntity<ApiResponse<AthleteProfile>> updateStatistics(@RequestBody Map<String, Object> statistics) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        AthleteProfile profile = profileService.updateStatistics(keycloakId, statistics);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @PutMapping("/me/social-links")
    public ResponseEntity<ApiResponse<AthleteProfile>> updateSocialLinks(@RequestBody Map<String, Object> socialLinks) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        AthleteProfile profile = profileService.updateSocialLinks(keycloakId, socialLinks);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @PutMapping("/me/visibility")
    public ResponseEntity<ApiResponse<AthleteProfile>> toggleVisibility(@RequestBody Map<String, Boolean> body) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        Boolean isPublic = body.get("isPublic");
        AthleteProfile profile = profileService.toggleProfileVisibility(keycloakId, isPublic);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}

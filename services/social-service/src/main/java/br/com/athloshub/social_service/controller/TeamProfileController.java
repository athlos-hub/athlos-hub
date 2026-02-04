package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.TeamProfile;
import br.com.athloshub.social_service.service.TeamProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/social/team-profiles")
@RequiredArgsConstructor
public class TeamProfileController {
    
    private final TeamProfileService teamProfileService;
    
    @PostMapping
    public ResponseEntity<ApiResponse<TeamProfile>> createOrGetTeamProfile(@RequestBody Map<String, String> body) {
        String teamId = body.get("teamId");
        String organizationSlug = body.get("organizationSlug");
        
        if (teamId == null || teamId.isBlank()) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("teamId é obrigatório"));
        }
        
        log.info("Criando/obtendo perfil para time: {}", teamId);
        
        TeamProfile profile = teamProfileService.getOrCreateProfile(teamId, organizationSlug);
        
        return ResponseEntity.ok(ApiResponse.success(profile, "Perfil de time criado/obtido com sucesso"));
    }
    
    @GetMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamProfile>> getTeamProfile(@PathVariable String teamId) {
        TeamProfile profile = teamProfileService.getProfileByTeamId(teamId);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
    
    @PutMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamProfile>> updateTeamProfile(
        @PathVariable String teamId,
        @RequestBody Map<String, Object> updates
    ) {
        TeamProfile profile = teamProfileService.updateProfile(teamId, updates);
        return ResponseEntity.ok(ApiResponse.success(profile, "Perfil atualizado com sucesso"));
    }
}

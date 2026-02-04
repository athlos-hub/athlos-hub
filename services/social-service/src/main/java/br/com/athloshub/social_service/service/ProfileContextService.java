package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.client.CompetitionsServiceClient;
import br.com.athloshub.social_service.dto.auth.OrganizationDTO;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import br.com.athloshub.social_service.dto.competitions.TeamDTO;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileContextService {
    
    private final AuthServiceClient authServiceClient;
    private final CompetitionsServiceClient competitionsServiceClient;
    private final JwtTokenProvider jwtTokenProvider;
    
    public boolean canCreatePostAsOrganization(String organizationSlug) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        String token = "Bearer " + jwtTokenProvider.getFullJwt()
            .map(jwt -> jwt.getTokenValue())
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Token não encontrado"));
        
        OrganizationDTO organization = authServiceClient.getOrganizationBySlug(organizationSlug, token);
        
        return organization.isAdmin();
    }
    
    public boolean canCreatePostAsTeam(String teamId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        String token = "Bearer " + jwtTokenProvider.getFullJwt()
            .map(jwt -> jwt.getTokenValue())
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Token não encontrado"));
        
        try {
            UUID teamUUID = UUID.fromString(teamId);
            
            TeamDTO team = competitionsServiceClient.getTeamById(teamUUID, token);
            
            UUID userUUID = UUID.fromString(keycloakId);
            
            boolean isMember = team.isPlayerMember(userUUID);
            
            return isMember;
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(BAD_REQUEST, "ID de equipe inválido");
        } catch (Exception e) {
            throw new ResponseStatusException(NOT_FOUND, "Equipe não encontrada ou você não tem acesso");
        }
    }
    
    public List<String> getUserOrganizationSlugs() {
        String token = "Bearer " + jwtTokenProvider.getFullJwt()
            .map(jwt -> jwt.getTokenValue())
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Token não encontrado"));
        
        List<OrganizationDTO> organizations = authServiceClient.getMyOrganizations(token);
        
        return organizations.stream()
            .map(OrganizationDTO::getSlug)
            .toList();
    }
    
    public Post.ProfileType determineProfileType(String profileId) {
        if (profileId == null) {
            return Post.ProfileType.ATHLETE;
        }
        
        if (profileId.startsWith("org-")) {
            return Post.ProfileType.ORGANIZATION;
        } else if (profileId.startsWith("team-")) {
            return Post.ProfileType.TEAM;
        } else {
            return Post.ProfileType.ATHLETE;
        }
    }
}

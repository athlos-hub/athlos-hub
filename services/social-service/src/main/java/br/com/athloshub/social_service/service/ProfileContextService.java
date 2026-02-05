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
        
        log.info("=== canCreatePostAsTeam ===");
        log.info("Team ID: {}", teamId);
        log.info("Keycloak ID: {}", keycloakId);
        
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        String token = "Bearer " + jwtTokenProvider.getFullJwt()
            .map(jwt -> jwt.getTokenValue())
            .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Token não encontrado"));
        
        try {
            UUID teamUUID = UUID.fromString(teamId);
            
            // CORREÇÃO: Buscar o user_id do banco usando o keycloak_id
            UserDTO currentUser = authServiceClient.getUserByKeycloakId(keycloakId, token);
            UUID userUUID = currentUser.getId();
            
            log.info("User ID no banco: {}", userUUID);
            
            // Buscar time no auth-service primeiro (times pendentes e aprovados)
            // Fallback para competitions-service se não encontrar no auth
            boolean isMember = false;
            
            try {
                log.info("Buscando time no auth-service...");
                br.com.athloshub.social_service.dto.auth.TeamDTO authTeam = 
                    authServiceClient.getTeamById(teamUUID, token);
                
                log.info("Time encontrado no auth-service: {} (status: {})", authTeam.getName(), authTeam.getStatus());
                log.info("Membros do time: {}", authTeam.getMembers() != null ? authTeam.getMembers().size() : 0);
                
                if (authTeam.getMembers() != null) {
                    authTeam.getMembers().forEach(member -> {
                        log.info("  - Membro: {} (user_id: {})", 
                            member.getUser() != null ? member.getUser().getUsername() : "null",
                            member.getUserId());
                    });
                }
                
                isMember = authTeam.isPlayerMember(userUUID);
                log.info("Usuário é membro? {}", isMember);
                
            } catch (Exception e) {
                log.warn("Time não encontrado no auth-service, tentando competitions-service: {}", e.getMessage());
                
                try {
                    br.com.athloshub.social_service.dto.competitions.TeamDTO competitionTeam = 
                        competitionsServiceClient.getTeamById(teamUUID, token);
                    
                    log.info("Time encontrado no competitions-service: {}", competitionTeam.getName());
                    log.info("Players do time: {}", competitionTeam.getPlayers() != null ? competitionTeam.getPlayers().size() : 0);
                    
                    if (competitionTeam.getPlayers() != null) {
                        competitionTeam.getPlayers().forEach(player -> {
                            log.info("  - Player: user_id={}", player.getUserId());
                        });
                    }
                    
                    isMember = competitionTeam.isPlayerMember(userUUID);
                    log.info("Usuário é membro (competitions)? {}", isMember);
                    
                } catch (Exception e2) {
                    log.error("Time não encontrado em nenhum serviço", e2);
                    throw e2;
                }
            }
            
            log.info("Resultado final: isMember={}", isMember);
            return isMember;
            
        } catch (IllegalArgumentException e) {
            log.error("ID de equipe inválido: {}", teamId, e);
            throw new ResponseStatusException(BAD_REQUEST, "ID de equipe inválido");
        } catch (Exception e) {
            log.error("Erro ao verificar permissão: {}", e.getMessage(), e);
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

package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.dto.auth.OrganizationDTO;
import br.com.athloshub.social_service.dto.auth.OrganizersListResponse;
import br.com.athloshub.social_service.dto.auth.TeamOverviewResponse;
import br.com.athloshub.social_service.entity.OrganizationFollow;
import br.com.athloshub.social_service.enums.NotificationType;
import br.com.athloshub.social_service.repository.OrganizationFollowRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizationFollowService {
    
    private final OrganizationFollowRepository organizationFollowRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthServiceClient authServiceClient;
    private final NotificationService notificationService;
    
    @Transactional
    public boolean toggleFollowOrganization(String organizationSlug) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        return organizationFollowRepository.findByFollowerKeycloakIdAndOrganizationSlug(keycloakId, organizationSlug)
            .map(existingFollow -> {
                organizationFollowRepository.delete(existingFollow);
                return false;
            })
            .orElseGet(() -> {
                OrganizationFollow newFollow = OrganizationFollow.builder()
                    .followerKeycloakId(keycloakId)
                    .organizationSlug(organizationSlug)
                    .build();
                
                organizationFollowRepository.save(newFollow);
                
                try {
                    String token = jwtTokenProvider.getCurrentToken();
                    if (token != null) {
                        log.info("Iniciando envio de notificações para organização: {}", organizationSlug);
                        
                        OrganizationDTO organization = authServiceClient.getOrganizationBySlug(
                            organizationSlug,
                            "Bearer " + token
                        );
                        log.info("Organização encontrada: {}", organization.getName());
                        
                        TeamOverviewResponse team = authServiceClient.getOrganizationTeam(
                            organizationSlug,
                            "Bearer " + token
                        );
                        log.info("Team encontrado - Owner: {}, Organizers: {}", 
                            team != null && team.getOwner() != null ? team.getOwner().getKeycloak_id() : "null",
                            team != null && team.getOrganizers() != null ? team.getOrganizers().size() : 0);
                        
                        if (team != null) {
                            List<String> notifiedKeycloakIds = new ArrayList<>();
                            
                            String actorName = "Usuário";
                            try {
                                br.com.athloshub.social_service.dto.auth.UserDTO actor = 
                                    authServiceClient.getUserByKeycloakId(keycloakId, "Bearer " + token);
                                if (actor != null) {
                                    actorName = actor.getFullName();
                                }
                            } catch (Exception e) {
                                log.warn("Não foi possível buscar nome do usuário {}: {}", keycloakId, e.getMessage());
                            }
                            
                            if (team.getOwner() != null && team.getOwner().getKeycloak_id() != null) {
                                notifiedKeycloakIds.add(team.getOwner().getKeycloak_id());
                                log.info("Owner adicionado para notificação: {}", team.getOwner().getKeycloak_id());
                            }
                            
                            if (team.getOrganizers() != null) {
                                for (OrganizersListResponse.OrganizerResponse organizer : team.getOrganizers()) {
                                    if (organizer.getUser() != null && organizer.getUser().getKeycloak_id() != null) {
                                        notifiedKeycloakIds.add(organizer.getUser().getKeycloak_id());
                                        log.info("Organizador adicionado para notificação: {}", organizer.getUser().getKeycloak_id());
                                    }
                                }
                            }
                            
                            log.info("Total de pessoas para notificar: {}", notifiedKeycloakIds.size());
                            
                            for (String recipientKeycloakId : notifiedKeycloakIds) {
                                java.util.Map<String, Object> notificationData = new java.util.HashMap<>();
                                notificationData.put("actorName", actorName);
                                notificationData.put("organizationName", organization.getName());
                                notificationData.put("organizationSlug", organizationSlug);
                                notificationData.put("actionUrl", "https://athlos-hub.com/organization/" + organizationSlug);
                                
                                notificationService.createNotification(
                                    recipientKeycloakId,
                                    keycloakId,
                                    NotificationType.ORGANIZATION_FOLLOW,
                                    null,
                                    "organization_follow",
                                    "começou a seguir a organização",
                                    notificationData
                                );
                            }
                            
                            log.info("Notificações enviadas para {} pessoas (owner + organizadores) da organização {}", 
                                notifiedKeycloakIds.size(), organizationSlug);
                        }
                    }
                } catch (Exception e) {
                    log.error("Erro ao enviar notificações de follow da organização {}: {}", organizationSlug, e.getMessage());
                }
                
                return true;
            });
    }
    
    @Transactional(readOnly = true)
    public boolean isFollowingOrganization(String organizationSlug) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            return false;
        }
        return organizationFollowRepository.existsByFollowerKeycloakIdAndOrganizationSlug(keycloakId, organizationSlug);
    }
    
    @Transactional(readOnly = true)
    public long getOrganizationFollowersCount(String organizationSlug) {
        return organizationFollowRepository.countByOrganizationSlug(organizationSlug);
    }
    
    @Transactional(readOnly = true)
    public Page<OrganizationFollow> getOrganizationFollowers(String organizationSlug, Pageable pageable) {
        return organizationFollowRepository.findByOrganizationSlug(organizationSlug, pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<OrganizationFollow> getMyFollowedOrganizations(Pageable pageable) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        return organizationFollowRepository.findByFollowerKeycloakId(keycloakId, pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<OrganizationFollow> getFollowedOrganizationsByUser(String keycloakId, Pageable pageable) {
        return organizationFollowRepository.findByFollowerKeycloakId(keycloakId, pageable);
    }
}

package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.OrganizationFollow;
import br.com.athloshub.social_service.repository.OrganizationFollowRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class OrganizationFollowService {
    
    private final OrganizationFollowRepository organizationFollowRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
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

package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.TeamProfile;
import br.com.athloshub.social_service.repository.TeamProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class TeamProfileService {
    
    private final TeamProfileRepository teamProfileRepository;
    
    @Transactional(readOnly = true)
    public TeamProfile getProfileByTeamId(String teamId) {
        return teamProfileRepository.findByTeamId(teamId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Perfil da equipe não encontrado"));
    }
    
    @Transactional(readOnly = true)
    public List<TeamProfile> getTeamsByOrganization(String organizationSlug) {
        return teamProfileRepository.findByOrganizationSlug(organizationSlug);
    }
    
    @Transactional
    public TeamProfile getOrCreateProfile(String teamId, String organizationSlug) {
        return teamProfileRepository.findByTeamId(teamId)
            .orElseGet(() -> {
                TeamProfile newProfile = TeamProfile.builder()
                    .teamId(teamId)
                    .organizationSlug(organizationSlug)
                    .build();
                return teamProfileRepository.save(newProfile);
            });
    }
    
    @Transactional
    public TeamProfile updateProfile(String teamId, Map<String, Object> updates) {
        TeamProfile profile = getProfileByTeamId(teamId);
        
        if (updates.containsKey("description")) {
            profile.setDescription((String) updates.get("description"));
        }
        if (updates.containsKey("socialLinks")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> socialLinks = (Map<String, Object>) updates.get("socialLinks");
            profile.setSocialLinks(socialLinks);
        }
        if (updates.containsKey("isPrivate")) {
            profile.setIsPrivate((Boolean) updates.get("isPrivate"));
        }
        
        return teamProfileRepository.save(profile);
    }
}

package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.OrganizationProfile;
import br.com.athloshub.social_service.repository.OrganizationProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class OrganizationProfileService {
    
    private final OrganizationProfileRepository organizationProfileRepository;
    
    @Transactional(readOnly = true)
    public OrganizationProfile getProfileBySlug(String slug) {
        return organizationProfileRepository.findByOrganizationSlug(slug)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Perfil da organização não encontrado"));
    }
    
    @Transactional
    public OrganizationProfile getOrCreateProfile(String slug) {
        return organizationProfileRepository.findByOrganizationSlug(slug)
            .orElseGet(() -> {
                OrganizationProfile newProfile = OrganizationProfile.builder()
                    .organizationSlug(slug)
                    .build();
                return organizationProfileRepository.save(newProfile);
            });
    }
    
    @Transactional
    public OrganizationProfile updateProfile(String slug, Map<String, Object> updates) {
        OrganizationProfile profile = getOrCreateProfile(slug);
        
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
        
        return organizationProfileRepository.save(profile);
    }
}

package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import br.com.athloshub.social_service.entity.AthleteProfile;
import br.com.athloshub.social_service.repository.AthleteProfileRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class AthleteProfileService {
    
    private final AthleteProfileRepository athleteProfileRepository;
    private final AuthServiceClient authServiceClient;
    private final JwtTokenProvider jwtTokenProvider;
    
    @Transactional(readOnly = true)
    public AthleteProfile getProfileByKeycloakId(String keycloakId) {
        return athleteProfileRepository.findByKeycloakId(keycloakId)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Perfil não encontrado"));
    }
    
    @Transactional(readOnly = true)
    public AthleteProfile getMyProfile() {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        return getProfileByKeycloakId(keycloakId);
    }
    
    @Transactional
    public AthleteProfile createOrUpdateProfile(
        String bio,
        String specialization,
        String city,
        String state,
        String country,
        Map<String, Object> achievements,
        Map<String, Object> statistics,
        Map<String, Object> socialLinks,
        Boolean isPublic
    ) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        AthleteProfile profile = athleteProfileRepository.findByKeycloakId(keycloakId)
            .orElse(AthleteProfile.builder()
                .keycloakId(keycloakId)
                .build());
        
        if (bio != null) profile.setBio(bio);
        if (specialization != null) profile.setSpecialization(specialization);
        if (city != null) profile.setCity(city);
        if (state != null) profile.setState(state);
        if (country != null) profile.setCountry(country);
        if (achievements != null) profile.setAchievements(achievements);
        if (statistics != null) profile.setStatistics(statistics);
        if (socialLinks != null) profile.setSocialLinks(socialLinks);
        if (isPublic != null) profile.setIsPublic(isPublic);
        
        return athleteProfileRepository.save(profile);
    }
    
    @Transactional(readOnly = true)
    public AthleteProfile getOrCreateProfile(String keycloakId) {
        return athleteProfileRepository.findByKeycloakId(keycloakId)
            .orElseGet(() -> {
                AthleteProfile newProfile = AthleteProfile.builder()
                    .keycloakId(keycloakId)
                    .build();
                return athleteProfileRepository.save(newProfile);
            });
    }
    
    @Transactional(readOnly = true)
    public UserDTO getUserWithProfile(String keycloakId, String authorization) {
        return authServiceClient.getAllUsers(authorization).stream()
            .filter(user -> user.getId().toString().equals(keycloakId))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Usuário não encontrado"));
    }
}

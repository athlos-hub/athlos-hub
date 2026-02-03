package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import br.com.athloshub.social_service.entity.Follow;
import br.com.athloshub.social_service.enums.NotificationType;
import br.com.athloshub.social_service.repository.AthleteProfileRepository;
import br.com.athloshub.social_service.repository.FollowRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FollowService {
    
    private final FollowRepository followRepository;
    private final AthleteProfileRepository athleteProfileRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationService notificationService;
    private final AuthServiceClient authServiceClient;
    
    @Transactional
    public boolean toggleFollow(String targetKeycloakId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }
        
        if (keycloakId.equals(targetKeycloakId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Você não pode seguir a si mesmo");
        }
        
        boolean isFollowing = followRepository.findByFollowerKeycloakIdAndFollowingKeycloakId(keycloakId, targetKeycloakId)
            .map(existingFollow -> {
                followRepository.delete(existingFollow);
                
                athleteProfileRepository.findByKeycloakId(keycloakId).ifPresent(profile -> {
                    profile.setFollowingCount(Math.max(0, profile.getFollowingCount() - 1));
                    athleteProfileRepository.save(profile);
                });
                
                athleteProfileRepository.findByKeycloakId(targetKeycloakId).ifPresent(profile -> {
                    profile.setFollowersCount(Math.max(0, profile.getFollowersCount() - 1));
                    athleteProfileRepository.save(profile);
                });
                
                return false;
            })
            .orElseGet(() -> {
                Follow newFollow = Follow.builder()
                    .followerKeycloakId(keycloakId)
                    .followingKeycloakId(targetKeycloakId)
                    .build();
                
                followRepository.save(newFollow);
                
                athleteProfileRepository.findByKeycloakId(keycloakId).ifPresent(profile -> {
                    profile.setFollowingCount(profile.getFollowingCount() + 1);
                    athleteProfileRepository.save(profile);
                });
                
                athleteProfileRepository.findByKeycloakId(targetKeycloakId).ifPresent(profile -> {
                    profile.setFollowersCount(profile.getFollowersCount() + 1);
                    athleteProfileRepository.save(profile);
                });
                
                try {
                    String actorName = "Usuário";
                    
                    try {
                        String token = jwtTokenProvider.getCurrentToken();
                        if (token != null) {
                            UserDTO actor = authServiceClient.getUserByKeycloakId(keycloakId, "Bearer " + token);
                            if (actor != null) {
                                actorName = actor.getFullName();
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Não foi possível buscar nome do usuário {}: {}", keycloakId, e.getMessage());
                    }
                    
                    java.util.Map<String, Object> notificationData = new java.util.HashMap<>();
                    notificationData.put("actorName", actorName);
                    notificationData.put("actorProfileUrl", "https://athlos-hub.com/profile/" + keycloakId);
                    notificationData.put("actionUrl", "https://athlos-hub.com/profile/" + keycloakId);
                    
                    notificationService.createNotification(
                        targetKeycloakId,
                        keycloakId,
                        NotificationType.FOLLOW,
                        null,
                        "follow",
                        "começou a seguir você",
                        notificationData
                    );
                } catch (Exception e) {
                    log.error("Erro ao criar notificação de follow", e);
                }
                
                return true;
            });
        
        return isFollowing;
    }
    
    @Transactional(readOnly = true)
    public boolean isFollowing(String targetKeycloakId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            return false;
        }
        return followRepository.existsByFollowerKeycloakIdAndFollowingKeycloakId(keycloakId, targetKeycloakId);
    }
    
    @Transactional(readOnly = true)
    public Page<Follow> getFollowers(String keycloakId, Pageable pageable) {
        return followRepository.findByFollowingKeycloakId(keycloakId, pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<Follow> getFollowing(String keycloakId, Pageable pageable) {
        return followRepository.findByFollowerKeycloakId(keycloakId, pageable);
    }
}

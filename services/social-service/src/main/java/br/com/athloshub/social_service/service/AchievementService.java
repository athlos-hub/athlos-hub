package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.dto.AchievementNotificationDTO;
import br.com.athloshub.social_service.entity.AthleteProfile;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.entity.TeamProfile;
import br.com.athloshub.social_service.enums.AchievementType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementService {
    
    private final PostService postService;
    private final AthleteProfileService athleteProfileService;
    private final TeamProfileService teamProfileService;
    
    @Transactional
    public Post processAchievement(AchievementNotificationDTO notification) {
        AchievementType type = notification.getAchievementType();
        String targetId = notification.getTargetId();
        String targetType = notification.getTargetType();
        
        log.info("Processando conquista {} para {} ({})", type, targetId, targetType);
        
        Map<String, Object> achievementData = new HashMap<>();
        achievementData.put("achievementType", type.name());
        achievementData.put("displayName", type.getDisplayName());
        achievementData.put("description", type.getDescription());
        achievementData.put("competitionId", notification.getCompetitionId());
        achievementData.put("competitionName", notification.getCompetitionName());
        
        if (notification.getMetadata() != null) {
            achievementData.putAll(notification.getMetadata());
        }
        
        String content = generateAchievementContent(type, notification);
        
        Post achievementPost;
        
        if ("PLAYER".equals(targetType)) {
            AthleteProfile profile = athleteProfileService.getOrCreateProfile(targetId);
            
            updatePlayerAchievements(profile, type, achievementData);
            
            achievementPost = postService.createAchievementPost(
                targetId,
                content,
                achievementData
            );
            
        } else if ("TEAM".equals(targetType)) {
            TeamProfile profile = teamProfileService.getOrCreateProfile(targetId, null);
            
            updateTeamAchievements(profile, type, achievementData);
            
            achievementPost = postService.createTeamAchievementPost(
                profile.getId(),
                targetId,
                content,
                achievementData
            );
        } else {
            throw new IllegalArgumentException("Tipo de target inválido: " + targetType);
        }
        
        log.info("Conquista {} processada com sucesso. Post ID: {}", type, achievementPost.getId());
        
        return achievementPost;
    }
    
    private String generateAchievementContent(AchievementType type, AchievementNotificationDTO notification) {
        String competitionName = notification.getCompetitionName() != null 
            ? notification.getCompetitionName() 
            : "uma competição";
        
        return String.format("🏆 Conquista desbloqueada: %s em %s! %s", 
            type.getDisplayName(), 
            competitionName,
            type.getDescription()
        );
    }
    
    private void updatePlayerAchievements(AthleteProfile profile, AchievementType type, Map<String, Object> data) {
        Map<String, Object> achievements = profile.getAchievements();
        if (achievements == null) {
            achievements = new HashMap<>();
        }
        
        if (!achievements.containsKey(type.name())) {
            achievements.put(type.name(), data);
            profile.setAchievements(achievements);
            profile.setAchievementsCount(achievements.size());
            
            athleteProfileService.updateAchievements(profile.getKeycloakId(), achievements);
        } else {
            log.info("Jogador {} já possui conquista {}", profile.getKeycloakId(), type.name());
        }
    }
    
    private void updateTeamAchievements(TeamProfile profile, AchievementType type, Map<String, Object> data) {
        Map<String, Object> achievements = profile.getAchievements();
        if (achievements == null) {
            achievements = new HashMap<>();
        }
        
        if (!achievements.containsKey(type.name())) {
            achievements.put(type.name(), data);
            profile.setAchievements(achievements);
            profile.setAchievementsCount(achievements.size());
            
            teamProfileService.saveProfile(profile);
            
            log.info("Conquista {} adicionada ao time {}", type, profile.getTeamId());
        } else {
            log.info("Time {} já possui conquista {}", profile.getTeamId(), type.name());
        }
    }
}

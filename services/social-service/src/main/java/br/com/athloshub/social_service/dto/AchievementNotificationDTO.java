package br.com.athloshub.social_service.dto;

import br.com.athloshub.social_service.enums.AchievementType;
import lombok.Data;

import java.util.Map;

@Data
public class AchievementNotificationDTO {
    private String targetId;
    private String targetType;
    private AchievementType achievementType;
    private String competitionId;
    private String competitionName;
    private Map<String, Object> metadata;
}

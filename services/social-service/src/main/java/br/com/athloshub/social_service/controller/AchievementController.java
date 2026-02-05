package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.AchievementNotificationDTO;
import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.service.AchievementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/social/achievements")
@RequiredArgsConstructor
public class AchievementController {
    
    private final AchievementService achievementService;
    
    @PostMapping("/notify")
    public ResponseEntity<ApiResponse<Post>> notifyAchievement(@RequestBody AchievementNotificationDTO notification) {
        log.info("Recebida notificação de conquista: {} para {} ({})", 
            notification.getAchievementType(), 
            notification.getTargetId(),
            notification.getTargetType()
        );
        
        Post achievementPost = achievementService.processAchievement(notification);
        
        return ResponseEntity.ok(ApiResponse.success(achievementPost, "Conquista registrada com sucesso"));
    }
}

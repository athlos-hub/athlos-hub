package br.com.athloshub.social_service.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/social")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "social-service");
        response.put("timestamp", LocalDateTime.now());
        response.put("message", "Social Service está rodando! 🚀");
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "social-service");
        response.put("version", "0.0.1-SNAPSHOT");
        response.put("description", "Serviço de rede social para AthlosHub");
        response.put("features", new String[]{
            "Perfil de Atleta",
            "Feed Esportivo",
            "Interação Social (Likes, Comentários)",
            "Integração com Auth Service"
        });
        
        return ResponseEntity.ok(response);
    }
}

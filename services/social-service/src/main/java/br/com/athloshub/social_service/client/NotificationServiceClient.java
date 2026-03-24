package br.com.athloshub.social_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationServiceClient {
    
    private final RestTemplate restTemplate;
    
    @Value("${services.notification.service.url:http://localhost:8003}")
    private String notificationServiceUrl;

    @Value("${services.notification.service.internal-api-key:}")
    private String notificationInternalApiKey;

    @Value("${services.notification.service.enabled:true}")
    private boolean notificationServiceEnabled;
    
    public void sendNotification(
        String recipientKeycloakId,
        String actorKeycloakId,
        String type,
        String entityId,
        String message,
        Map<String, Object> additionalData
    ) {
        if (!notificationServiceEnabled) {
            log.debug("Notificações desabilitadas, pulando envio");
            return;
        }
        
        try {
            String url = notificationServiceUrl + "/api/v1/notifications/internal";
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("user_id", recipientKeycloakId);
            payload.put("type", type.toLowerCase());
            
            String title = (String) additionalData.getOrDefault("title", message);
            String body = (String) additionalData.getOrDefault("body", message);
            
            payload.put("title", title);
            payload.put("message", body);
            
            Map<String, Object> extraData = new HashMap<>();
            if (additionalData != null) {
                additionalData.forEach((key, value) -> {
                    if (!"title".equals(key) && !"body".equals(key)) {
                        extraData.put(key, value);
                    }
                });
            }
            extraData.put("actor_keycloak_id", actorKeycloakId);
            if (entityId != null) {
                extraData.put("entity_id", entityId);
            }
            
            payload.put("extra_data", extraData);
            
            String actionUrl = (String) additionalData.get("actionUrl");
            if (actionUrl != null) {
                payload.put("action_url", actionUrl);
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (notificationInternalApiKey != null && !notificationInternalApiKey.isBlank()) {
                headers.set("X-Internal-API-Key", notificationInternalApiKey);
            }
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.debug("Notificação enviada com sucesso para {}", recipientKeycloakId);
            } else {
                log.warn("Falha ao enviar notificação: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Erro ao enviar notificação para o serviço de notificações", e);
        }
    }
}

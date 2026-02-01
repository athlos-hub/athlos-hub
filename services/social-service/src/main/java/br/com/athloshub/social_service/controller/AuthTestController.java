package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.security.JwtTokenProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller para testar autenticação JWT.
 */
@RestController
@RequestMapping("/api/social/auth")
public class AuthTestController {
    
    private final JwtTokenProvider jwtTokenProvider;
    
    public AuthTestController(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }
    
    /**
     * Endpoint protegido - requer autenticação.
     * Retorna informações do usuário autenticado extraídas do JWT.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        Map<String, Object> response = new HashMap<>();
        
        response.put("keycloakId", jwtTokenProvider.getCurrentKeycloakId());
        response.put("email", jwtTokenProvider.getCurrentUserEmail());
        response.put("username", jwtTokenProvider.getCurrentUsername());
        response.put("firstName", jwtTokenProvider.getCurrentUserFirstName());
        response.put("lastName", jwtTokenProvider.getCurrentUserLastName());
        response.put("emailVerified", jwtTokenProvider.isEmailVerified());
        response.put("authenticated", jwtTokenProvider.isAuthenticated());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Endpoint público - não requer autenticação.
     */
    @GetMapping("/public")
    public ResponseEntity<Map<String, String>> publicEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Este é um endpoint público - não requer autenticação ✅");
        response.put("status", "accessible");
        response.put("timestamp", java.time.LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Endpoint que requer role específica.
     * Apenas usuários com role ATHLETE podem acessar.
     */
    @GetMapping("/athlete-only")
    @PreAuthorize("hasRole('ATHLETE')")
    public ResponseEntity<Map<String, Object>> athleteOnly() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Você é um atleta! 🏆");
        response.put("keycloakId", jwtTokenProvider.getCurrentKeycloakId());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Endpoint que requer role de admin.
     */
    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> adminOnly() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Você é um administrador! 👑");
        response.put("keycloakId", jwtTokenProvider.getCurrentKeycloakId());
        
        return ResponseEntity.ok(response);
    }
}

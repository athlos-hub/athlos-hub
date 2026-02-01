package br.com.athloshub.social_service.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Utilitário para extrair informações do JWT token.
 * 
 * Este componente NÃO faz autenticação - apenas extrai dados do token já validado.
 * A validação do token é feita automaticamente pelo Spring Security OAuth2 Resource Server.
 */
@Component
public class JwtTokenProvider {
    
    /**
     * Extrai o Keycloak ID (sub claim) do token JWT atual.
     * 
     * @return Keycloak ID do usuário autenticado, ou null se não autenticado
     */
    public String getCurrentKeycloakId() {
        return getJwt()
            .map(Jwt::getSubject)
            .orElse(null);
    }
    
    /**
     * Extrai o email do token JWT atual.
     * 
     * @return Email do usuário, ou null se não disponível
     */
    public String getCurrentUserEmail() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("email"))
            .orElse(null);
    }
    
    /**
     * Extrai o username preferencial do token JWT atual.
     * 
     * @return Username, ou null se não disponível
     */
    public String getCurrentUsername() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("preferred_username"))
            .orElse(null);
    }
    
    /**
     * Extrai o nome completo do token JWT atual.
     * 
     * @return Nome completo, ou null se não disponível
     */
    public String getCurrentUserFullName() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("name"))
            .orElse(null);
    }
    
    /**
     * Extrai o primeiro nome do token JWT atual.
     * 
     * @return Primeiro nome, ou null se não disponível
     */
    public String getCurrentUserFirstName() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("given_name"))
            .orElse(null);
    }
    
    /**
     * Extrai o sobrenome do token JWT atual.
     * 
     * @return Sobrenome, ou null se não disponível
     */
    public String getCurrentUserLastName() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("family_name"))
            .orElse(null);
    }
    
    /**
     * Verifica se o email do usuário foi verificado.
     * 
     * @return true se o email foi verificado, false caso contrário
     */
    public boolean isEmailVerified() {
        return getJwt()
            .map(jwt -> Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified")))
            .orElse(false);
    }
    
    /**
     * Verifica se o usuário está autenticado.
     * 
     * @return true se há um token JWT válido no contexto
     */
    public boolean isAuthenticated() {
        return getJwt().isPresent();
    }
    
    /**
     * Obtém o JWT do contexto de segurança.
     * 
     * @return Optional contendo o JWT, ou vazio se não autenticado
     */
    private Optional<Jwt> getJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            return Optional.of(jwtAuth.getToken());
        }
        
        return Optional.empty();
    }
    
    /**
     * Obtém o JWT completo (para casos avançados).
     * 
     * @return Optional contendo o JWT
     */
    public Optional<Jwt> getFullJwt() {
        return getJwt();
    }
}

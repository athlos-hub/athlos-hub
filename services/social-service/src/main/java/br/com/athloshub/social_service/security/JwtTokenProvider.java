package br.com.athloshub.social_service.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class JwtTokenProvider {
    
    public String getCurrentKeycloakId() {
        return getJwt()
            .map(Jwt::getSubject)
            .orElse(null);
    }
    
    public String getCurrentUserEmail() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("email"))
            .orElse(null);
    }
    
    public String getCurrentUsername() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("preferred_username"))
            .orElse(null);
    }
    
    public String getCurrentUserFullName() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("name"))
            .orElse(null);
    }
    
    public String getCurrentUserFirstName() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("given_name"))
            .orElse(null);
    }
    
    public String getCurrentUserLastName() {
        return getJwt()
            .map(jwt -> jwt.getClaimAsString("family_name"))
            .orElse(null);
    }
    
    public boolean isEmailVerified() {
        return getJwt()
            .map(jwt -> Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified")))
            .orElse(false);
    }
    
    public boolean isAuthenticated() {
        return getJwt().isPresent();
    }
    
    private Optional<Jwt> getJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            return Optional.of(jwtAuth.getToken());
        }
        
        return Optional.empty();
    }
    
    public String getCurrentToken() {
        return getJwt()
            .map(Jwt::getTokenValue)
            .orElse(null);
    }
    
    public Optional<Jwt> getFullJwt() {
        return getJwt();
    }
}

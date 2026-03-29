package br.com.athloshub.social_service.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Identidade a partir do {@link GatewayIdentityFilter} (cabeçalhos do Kong), sem validar JWT.
 *
 * <p>JWT validation is handled exclusively by Kong Gateway.
 * This service trusts X-Keycloak-Sub injected by Kong.
 * Do NOT add JWT validation here — it breaks the single-responsibility contract.
 */
@Component
public class JwtTokenProvider {

    private Optional<GatewayUserAuthentication> gatewayAuth() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof GatewayUserAuthentication g) {
            return Optional.of(g);
        }
        return Optional.empty();
    }

    public String getCurrentKeycloakId() {
        return gatewayAuth().map(a -> (String) a.getPrincipal()).orElse(null);
    }

    public String getCurrentUserEmail() {
        return gatewayAuth().map(GatewayUserAuthentication::getEmail).orElse(null);
    }

    public String getCurrentUsername() {
        return gatewayAuth()
                .map(GatewayUserAuthentication::getPreferredUsername)
                .orElse(null);
    }

    public String getCurrentUserFullName() {
        return null;
    }

    public String getCurrentUserFirstName() {
        return null;
    }

    public String getCurrentUserLastName() {
        return null;
    }

    public boolean isEmailVerified() {
        return false;
    }

    public boolean isAuthenticated() {
        return gatewayAuth().isPresent();
    }

    /**
     * Bearer completo repassado pelo cliente via Kong (sem validação neste serviço).
     */
    public String getCurrentToken() {
        return gatewayAuth()
                .map(a -> (String) a.getCredentials())
                .filter(s -> s != null && s.startsWith("Bearer "))
                .map(s -> s.substring("Bearer ".length()))
                .orElse(null);
    }

    /**
     * Cabeçalho Authorization original (ex.: "Bearer ..."), para Feign.
     */
    public String getBearerAuthorizationHeader() {
        return gatewayAuth().map(a -> (String) a.getCredentials()).orElse(null);
    }
}

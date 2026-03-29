package br.com.athloshub.social_service.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

/**
 * Autenticação derivada dos cabeçalhos injetados pelo Kong após validar o JWT no gateway.
 */
public class GatewayUserAuthentication extends AbstractAuthenticationToken {

    private final String keycloakSub;
    private final String authorizationHeader;
    private final String email;
    private final String preferredUsername;

    public GatewayUserAuthentication(
            String keycloakSub,
            String authorizationHeader,
            String email,
            String preferredUsername,
            Collection<? extends GrantedAuthority> authorities
    ) {
        super(authorities);
        this.keycloakSub = keycloakSub;
        this.authorizationHeader = authorizationHeader;
        this.email = email;
        this.preferredUsername = preferredUsername;
        setAuthenticated(true);
    }

    public String getEmail() {
        return email;
    }

    public String getPreferredUsername() {
        return preferredUsername;
    }

    @Override
    public Object getCredentials() {
        return authorizationHeader;
    }

    @Override
    public Object getPrincipal() {
        return keycloakSub;
    }
}

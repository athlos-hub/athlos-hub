package br.com.athloshub.social_service.security;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Lê X-Keycloak-Sub / X-Keycloak-Roles (e repassa Authorization para Feign) sem validar JWT.
 *
 * <p>JWT validation is handled exclusively by Kong Gateway.
 * This service trusts X-Keycloak-Sub injected by Kong.
 * Do NOT add JWT validation here — it breaks the single-responsibility contract.
 */
@Component
public class GatewayIdentityFilter extends OncePerRequestFilter {

    private static final String HDR_SUB = "X-Keycloak-Sub";
    private static final String HDR_TEST_SUB = "X-Test-Sub";
    private static final String HDR_ROLES = "X-Keycloak-Roles";
    private static final String HDR_TEST_ROLES = "X-Test-Roles";
    private static final String HDR_EMAIL = "X-Keycloak-Email";
    private static final String HDR_USERNAME = "X-Keycloak-Preferred-Username";

    private final boolean trustGateway;
    private final String env;

    public GatewayIdentityFilter(
            @Value("${TRUST_GATEWAY:true}") boolean trustGateway,
            @Value("${spring.profiles.active:dev}") String env) {
        this.trustGateway = trustGateway;
        this.env = env != null ? env.trim() : "dev";
    }

    @PostConstruct
    void validateTrustGatewayInProduction() {
        String e = env.toLowerCase();
        if ((e.equals("prod") || e.equals("production")) && !trustGateway) {
            throw new IllegalStateException("TRUST_GATEWAY cannot be false when ENV is production");
        }
    }

    private boolean isProd() {
        String e = env.toLowerCase();
        return e.equals("prod") || e.equals("production");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String sub = request.getHeader(HDR_SUB);
        if (!StringUtils.hasText(sub)
                && !trustGateway
                && !isProd()
                && StringUtils.hasText(request.getHeader(HDR_TEST_SUB))) {
            sub = request.getHeader(HDR_TEST_SUB);
        }

        if (StringUtils.hasText(sub)) {
            String rolesHeader = request.getHeader(HDR_ROLES);
            if (!StringUtils.hasText(rolesHeader)
                    && !trustGateway
                    && !isProd()
                    && StringUtils.hasText(request.getHeader(HDR_TEST_ROLES))) {
                rolesHeader = request.getHeader(HDR_TEST_ROLES);
            }
            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
            if (StringUtils.hasText(rolesHeader)) {
                for (String r : rolesHeader.split(",")) {
                    String t = r.trim();
                    if (!t.isEmpty()) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + t.toUpperCase()));
                    }
                }
            }
            String authorization = request.getHeader("Authorization");
            String email = request.getHeader(HDR_EMAIL);
            String preferredUsername = request.getHeader(HDR_USERNAME);
            var auth = new GatewayUserAuthentication(
                    sub,
                    authorization,
                    email,
                    preferredUsername,
                    authorities
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        } else {
            SecurityContextHolder.clearContext();
        }
        filterChain.doFilter(request, response);
    }
}

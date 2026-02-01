package br.com.athloshub.social_service.config;

import br.com.athloshub.social_service.security.KeycloakJwtConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configuração de segurança do Social Service.
 * 
 * Este serviço NÃO faz autenticação - apenas VALIDA tokens JWT do Keycloak.
 * A autenticação (login/logout) é feita pelo auth-service.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Value("${cors.allowed-origins:*}")
    private String[] allowedOrigins;
    
    private final KeycloakJwtConverter keycloakJwtConverter;
    
    public SecurityConfig(KeycloakJwtConverter keycloakJwtConverter) {
        this.keycloakJwtConverter = keycloakJwtConverter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                // Endpoints públicos (não requerem autenticação)
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/api/social/health", "/api/social/info").permitAll()
                .requestMatchers("/api/social/auth/public").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/api-docs/**").permitAll()
                
                // TODO: Temporariamente permitindo tudo para desenvolvimento
                // Depois vamos proteger: .requestMatchers("/api/social/**").authenticated()
                .anyRequest().permitAll()
            )
            // OAuth2 Resource Server - valida JWT quando presente
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
                // Importante: não retornar 401 se não houver token em endpoints públicos
                .authenticationEntryPoint((request, response, authException) -> {
                    // Se o endpoint é público, não enviar erro 401
                    String requestUri = request.getRequestURI();
                    if (isPublicEndpoint(requestUri)) {
                        response.setStatus(200);
                        return;
                    }
                    // Para endpoints protegidos, retornar 401
                    response.setStatus(401);
                    response.setHeader("WWW-Authenticate", "Bearer");
                    response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Token JWT ausente ou inválido\"}");
                })
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );
        
        return http.build();
    }
    
    /**
     * Verifica se o endpoint é público.
     */
    private boolean isPublicEndpoint(String uri) {
        return uri.startsWith("/actuator/") ||
               uri.startsWith("/swagger-ui/") ||
               uri.startsWith("/v3/api-docs/") ||
               uri.startsWith("/api-docs/") ||
               uri.equals("/api/social/health") ||
               uri.equals("/api/social/info") ||
               uri.equals("/api/social/auth/public");
    }
    
    /**
     * Configura o conversor de JWT para extrair authorities (roles) do Keycloak.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(keycloakJwtConverter);
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Usar origens configuradas ou permitir todas em dev
        if (allowedOrigins.length == 1 && "*".equals(allowedOrigins[0])) {
            configuration.setAllowedOrigins(List.of("*"));
            configuration.setAllowCredentials(false);
        } else {
            configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
            configuration.setAllowCredentials(true);
        }
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

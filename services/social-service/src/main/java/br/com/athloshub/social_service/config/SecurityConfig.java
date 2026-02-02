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
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/api/social/health", "/api/social/info").permitAll()
                .requestMatchers("/api/social/auth/public").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/api-docs/**").permitAll()
                .requestMatchers("/api/social/feed/public").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/posts/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/posts/{postId}/comments").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/profile/{keycloakId}").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/athlete/posts/{keycloakId}").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/shares/user/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/shares/count/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/search/**").permitAll()
                
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );
        
        return http.build();
    }
    
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(keycloakJwtConverter);
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
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

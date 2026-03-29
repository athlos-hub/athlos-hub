package br.com.athloshub.social_service.config;

import br.com.athloshub.social_service.security.GatewayIdentityFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
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

    @Bean
    public GatewayIdentityFilter gatewayIdentityFilter() {
        return new GatewayIdentityFilter();
    }

    @Bean
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, GatewayIdentityFilter gatewayIdentityFilter)
            throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .addFilterBefore(gatewayIdentityFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/api/social/health", "/api/social/info").permitAll()
                        .requestMatchers("/api/social/auth/public").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/api-docs/**").permitAll()
                        .requestMatchers("/api/social/feed/public").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/posts/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/posts/{postId}/comments")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/profile/{keycloakId}")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/athlete/posts/{keycloakId}")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/shares/user/**")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/shares/count/**")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/search/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/social/team-profiles")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/social/achievements/notify")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/organization-profiles/**")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/team-profiles/**")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/team-follow/count/**")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/social/teams/*/posts")
                        .permitAll()
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                );

        return http.build();
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

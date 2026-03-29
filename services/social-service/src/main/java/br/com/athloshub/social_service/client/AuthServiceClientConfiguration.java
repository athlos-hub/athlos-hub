package br.com.athloshub.social_service.client;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import feign.codec.ErrorDecoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.athloshub.social_service.security.GatewayUserAuthentication;

@Configuration
public class AuthServiceClientConfiguration {
    
    @Bean
    public RequestInterceptor requestInterceptor() {
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate template) {
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                
                if (authentication instanceof GatewayUserAuthentication gw) {
                    String hdr = (String) gw.getCredentials();
                    if (hdr != null && !hdr.isBlank()) {
                        template.header("Authorization", hdr);
                    }
                }
            }
        };
    }
    
    @Bean
    public ErrorDecoder errorDecoder() {
        return new AuthServiceErrorDecoder();
    }
}

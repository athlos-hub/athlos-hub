package br.com.athloshub.social_service.moderation;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableConfigurationProperties(OpenAiModerationProperties.class)
public class ModerationConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}

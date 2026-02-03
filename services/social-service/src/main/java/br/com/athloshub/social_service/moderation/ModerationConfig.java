package br.com.athloshub.social_service.moderation;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(OpenAiModerationProperties.class)
public class ModerationConfig {
    // RestTemplate é fornecido por RestTemplateConfig
}

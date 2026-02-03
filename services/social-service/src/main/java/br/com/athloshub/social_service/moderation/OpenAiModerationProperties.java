package br.com.athloshub.social_service.moderation;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuração via application.yaml / variáveis de ambiente.
 *
 * openai:
 *   moderation:
 *     enabled: true
 *     api-key: ...
 *     model: omni-moderation-latest
 *     base-url: https://api.openai.com/v1
 */
@Data
@ConfigurationProperties(prefix = "openai.moderation")
public class OpenAiModerationProperties {

    private boolean enabled = true;
    private String apiKey;
    private String model = "omni-moderation-latest";
    private String baseUrl = "https://api.openai.com/v1";
}

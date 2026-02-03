package br.com.athloshub.social_service.moderation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiModerationClient {

    private final RestTemplate restTemplate;
    private final OpenAiModerationProperties props;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ModerationResult moderate(String text) {
        String url = props.getBaseUrl().replaceAll("/$", "") + "/moderations";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(props.getApiKey());

        Map<String, Object> body = new HashMap<>();
        body.put("model", props.getModel());
        body.put("input", text);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> resp = restTemplate.postForEntity(url, entity, String.class);

            JsonNode root = objectMapper.readTree(resp.getBody() == null ? "{}" : resp.getBody());
            JsonNode first = root.path("results").isArray() && root.path("results").size() > 0
                    ? root.path("results").get(0)
                    : null;

            boolean flagged = first != null && first.path("flagged").asBoolean(false);
            JsonNode categories = first != null ? first.path("categories") : null;
            JsonNode categoryScores = first != null ? first.path("category_scores") : null;

            return new ModerationResult(flagged, categories, categoryScores);
        } catch (RestClientException e) {
            log.error("Erro ao chamar OpenAI Moderation API", e);
            throw e;
        } catch (Exception e) {
            log.error("Erro ao parsear resposta da OpenAI Moderation API", e);
            throw new RuntimeException("Falha ao processar resposta de moderação", e);
        }
    }
}

package br.com.athloshub.social_service.moderation;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ModerationService {

    private final OpenAiModerationClient client;
    private final OpenAiModerationProperties props;

    /**
     * retorna 422 se for reprovado
     */
    public void assertAllowed(String text) {
        if (text == null || text.isBlank()) return;

        if (props.getApiKey() == null || props.getApiKey().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Moderação habilitada, mas OPENAI_API_KEY não está configurada"
            );
        }

        ModerationResult result;
        try {
            result = client.moderate(text);
        } catch (RestClientException e) {
            // Falha de integração: bloqueia para não publicar conteúdo sem moderação
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Serviço de moderação indisponível. Tente novamente em instantes."
            );
        }

        if (result.flagged()) {
            String reasons = extractFlaggedCategories(result);
            String msg = reasons.isEmpty()
                    ? "Conteúdo reprovado pela moderação"
                    : "Conteúdo reprovado pela moderação (" + reasons + ")";
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, msg);
        }
    }

    private String extractFlaggedCategories(ModerationResult result) {
        if (result.categories() == null || !result.categories().isObject()) return "";
        List<String> flagged = new ArrayList<>();
        Iterator<String> names = result.categories().fieldNames();
        while (names.hasNext()) {
            String name = names.next();
            if (result.categories().path(name).asBoolean(false)) {
                flagged.add(name);
            }
        }
        return String.join(", ", flagged);
    }
}

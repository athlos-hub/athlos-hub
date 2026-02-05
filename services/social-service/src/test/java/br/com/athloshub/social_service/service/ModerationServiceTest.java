package br.com.athloshub.social_service.moderation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModerationServiceTest {

    @Mock OpenAiModerationClient client;
    @Mock OpenAiModerationProperties props;

    @InjectMocks ModerationService service;

    private final ObjectMapper om = new ObjectMapper();

    @Test
    void assertAllowed_whenNull_shouldReturnAndNotCallClient() {
        service.assertAllowed(null);
        verifyNoInteractions(client);
        verifyNoInteractions(props);
    }

    @Test
    void assertAllowed_whenBlank_shouldReturnAndNotCallClient() {
        service.assertAllowed("   ");
        verifyNoInteractions(client);
        verifyNoInteractions(props);
    }

    @Test
    void assertAllowed_whenApiKeyMissing_shouldThrow500() {
        when(props.getApiKey()).thenReturn("");

        assertThatThrownBy(() -> service.assertAllowed("oi"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException e = (ResponseStatusException) ex;
                    assertThat(e.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
                });

        verify(props, times(2)).getApiKey();
        verifyNoInteractions(client);
    }

    @Test
    void assertAllowed_whenClientUnavailable_shouldThrow503() {
        when(props.getApiKey()).thenReturn("key");
        when(client.moderate("oi")).thenThrow(new RestClientException("down"));

        assertThatThrownBy(() -> service.assertAllowed("oi"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException e = (ResponseStatusException) ex;
                    assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                });

        verify(client).moderate("oi");
    }

    @Test
    void assertAllowed_whenFlaggedWithCategories_shouldThrow422WithReasons() {
        when(props.getApiKey()).thenReturn("key");

        JsonNode categories = om.createObjectNode()
                .put("hate", true)
                .put("sexual", false)
                .put("violence", true);

        ModerationResult result = new ModerationResult(true, categories, null);
        when(client.moderate("texto")).thenReturn(result);

        assertThatThrownBy(() -> service.assertAllowed("texto"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException e = (ResponseStatusException) ex;
                    assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                    assertThat(e.getReason()).contains("hate").contains("violence");
                });

        verify(client).moderate("texto");
    }

    @Test
    void assertAllowed_whenFlaggedWithoutCategories_shouldThrow422Generic() {
        when(props.getApiKey()).thenReturn("key");

        ModerationResult result = new ModerationResult(true, null, null);
        when(client.moderate("texto")).thenReturn(result);

        assertThatThrownBy(() -> service.assertAllowed("texto"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException e = (ResponseStatusException) ex;
                    assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                    assertThat(e.getReason()).contains("Conteúdo reprovado pela moderação");
                });

        verify(client).moderate("texto");
    }

    @Test
    void assertAllowed_whenNotFlagged_shouldPass() {
        when(props.getApiKey()).thenReturn("key");

        JsonNode categories = om.createObjectNode().put("hate", false);
        ModerationResult result = new ModerationResult(false, categories, null);
        when(client.moderate("ok")).thenReturn(result);

        assertThatCode(() -> service.assertAllowed("ok")).doesNotThrowAnyException();

        verify(client).moderate("ok");
    }
}

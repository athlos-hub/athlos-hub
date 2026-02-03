package br.com.athloshub.social_service.moderation;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Resultado minimo necessario para o gate de moderação
 * categories/category_scores é armazenado como JsonNode para não acoplar em um schema
 */
public record ModerationResult(
        boolean flagged,
        JsonNode categories,
        JsonNode categoryScores
) {
}

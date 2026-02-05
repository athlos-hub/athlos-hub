package br.com.athloshub.social_service.enums;

import lombok.Getter;

@Getter
public enum AchievementType {
    // Conquistas de Jogadores
    TOP_SCORER("🎯 Artilheiro", "Maior pontuador da competição", "PLAYER"),
    CHAMPION("👑 Campeão", "Campeão da competição", "PLAYER"),
    RUNNER_UP("🥈 Vice-Campeão", "Vice-campeão da competição", "PLAYER"),
    UNDEFEATED("💪 Invencível", "Completou competição sem derrotas", "PLAYER"),
    HAT_TRICK_WINS("⚡ Hat-trick", "3 vitórias consecutivas", "PLAYER"),
    
    // Conquistas de Times
    TEAM_CHAMPION("👑 Campeão", "Time campeão da competição", "TEAM"),
    BEST_DEFENSE("🛡️ Muralha", "Melhor defesa da competição", "TEAM"),
    POWERFUL_ATTACK("🎯 Ataque Implacável", "Ataque com 50+ pontos", "TEAM"),
    TEAM_UNDEFEATED("💪 Invencível", "Time sem derrotas na competição", "TEAM"),
    
    // Conquistas Gerais
    VETERAN("🎖️ Veterano", "Participou de 5+ competições", "BOTH"),
    MULTI_CHAMPION("🌟 Multicampeão", "Venceu 3+ competições", "BOTH");
    
    private final String displayName;
    private final String description;
    private final String targetType; // PLAYER, TEAM, BOTH
    
    AchievementType(String displayName, String description, String targetType) {
        this.displayName = displayName;
        this.description = description;
        this.targetType = targetType;
    }
}

package br.com.athloshub.social_service.dto.competitions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private UUID id;
    private String name;
    private String abbreviation;
    private String status;
    private Integer competitionId;
    private UUID teamCaptain;
    private List<PlayerDTO> players;
    private LocalDateTime createdAt;
    
    public boolean isPlayerMember(UUID userId) {
        if (players == null) {
            return false;
        }
        return players.stream()
            .anyMatch(player -> player.getUserId().equals(userId));
    }
    
    public boolean isCaptain(UUID userId) {
        return teamCaptain != null && teamCaptain.equals(userId);
    }
}

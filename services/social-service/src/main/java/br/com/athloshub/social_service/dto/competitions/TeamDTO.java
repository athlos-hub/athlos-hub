package br.com.athloshub.social_service.dto.competitions;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    
    @JsonProperty("competition_id")
    private Integer competitionId;
    
    @JsonProperty("team_captain")
    private UUID teamCaptain;
    
    private List<PlayerDTO> players;
    
    @JsonProperty("created_at")
    private LocalDateTime createdAt;
    
    public boolean isPlayerMember(UUID userId) {
        if (players == null) {
            return false;
        }
        return players.stream()
            .anyMatch(player -> player.getUserId() != null && player.getUserId().equals(userId));
    }
    
    public boolean isCaptain(UUID userId) {
        return teamCaptain != null && teamCaptain.equals(userId);
    }
}

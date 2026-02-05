package br.com.athloshub.social_service.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private UUID id;
    
    @JsonProperty("team_id")
    private UUID teamId;
    
    @JsonProperty("user_id")
    private UUID userId;
    
    @JsonProperty("is_captain")
    private Boolean isCaptain;
    
    @JsonProperty("joined_at")
    private LocalDateTime joinedAt;
    
    private TeamMemberUserDTO user;
}

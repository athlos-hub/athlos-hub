package br.com.athloshub.social_service.dto.auth;

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
    
    @JsonProperty("organization_id")
    private UUID organizationId;
    
    @JsonProperty("organization_slug")
    private String organizationSlug;
    
    @JsonProperty("organization_name")
    private String organizationName;
    
    @JsonProperty("competition_name")
    private String competitionName;
    
    private String name;
    private String abbreviation;
    private String status;
    
    @JsonProperty("captain_id")
    private String captainId;
    
    @JsonProperty("min_members")
    private Integer minMembers;
    
    @JsonProperty("max_members")
    private Integer maxMembers;
    
    @JsonProperty("member_count")
    private Integer memberCount;
    
    private List<TeamMemberDTO> members;
    
    @JsonProperty("external_team_id")
    private UUID externalTeamId;
    
    @JsonProperty("created_at")
    private LocalDateTime createdAt;
    
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
    
    public boolean isPlayerMember(UUID userId) {
        if (members == null) {
            return false;
        }
        return members.stream()
            .anyMatch(member -> member.getUserId() != null && member.getUserId().equals(userId));
    }
    
    public boolean isCaptain(String keycloakId) {
        return captainId != null && captainId.equals(keycloakId);
    }
}

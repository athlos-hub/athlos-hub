package br.com.athloshub.social_service.dto.auth;

import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class TeamOverviewResponse {
    private UserDTO owner;
    private List<OrganizersListResponse.OrganizerResponse> organizers;
    private List<OrganizationMemberResponse> members;
    private Integer totalMembers;
    private Integer totalOrganizers;
    private Instant createdAt;
    
    @Data
    public static class OrganizationMemberResponse {
        private java.util.UUID id;
        private UserDTO user;
        private String role;
        private Instant joinedAt;
    }
}

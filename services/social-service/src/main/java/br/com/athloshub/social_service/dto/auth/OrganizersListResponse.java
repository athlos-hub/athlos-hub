package br.com.athloshub.social_service.dto.auth;

import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
public class OrganizersListResponse {
    private Integer total;
    private List<OrganizerResponse> organizers;
    
    @Data
    public static class OrganizerResponse {
        private UUID id;
        private UserDTO user;
        private Instant addedAt;
    }
}

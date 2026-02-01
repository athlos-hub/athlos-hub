package br.com.athloshub.social_service.dto.auth;

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
public class OrganizationDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private UUID id;
    private String slug;
    private String name;
    private String description;
    private String logoUrl;
    private String privacy;
    private UUID ownerId;
    private String status;
    private String joinPolicy;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    public boolean isOwner() {
        return "OWNER".equalsIgnoreCase(role);
    }
    public boolean isAdmin() {
        return isOwner() || "ORGANIZER".equalsIgnoreCase(role);
    }
    public boolean isMember() {
        return role != null && !role.isEmpty();
    }
}

package br.com.athloshub.social_service.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberUserDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private UUID id;
    
    @JsonProperty("keycloak_id")
    private String keycloakId;
    
    private String username;
    
    @JsonProperty("first_name")
    private String firstName;
    
    @JsonProperty("last_name")
    private String lastName;
    
    @JsonProperty("avatar_url")
    private String avatarUrl;
}

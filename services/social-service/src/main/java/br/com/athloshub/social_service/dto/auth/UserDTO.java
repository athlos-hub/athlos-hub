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
public class UserDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private UUID id;
    
    @JsonProperty("keycloak_id")
    private String keycloak_id;
    
    private String username;
    private String email;
    
    @JsonProperty("first_name")
    private String firstName;
    
    @JsonProperty("last_name")
    private String lastName;
    
    @JsonProperty("avatar_url")
    private String avatarUrl;
    public String getFullName() {
        if (firstName == null && lastName == null) {
            return username;
        }
        if (firstName == null) {
            return lastName;
        }
        if (lastName == null) {
            return firstName;
        }
        return firstName + " " + lastName;
    }
    public String getInitials() {
        StringBuilder initials = new StringBuilder();
        
        if (firstName != null && !firstName.isEmpty()) {
            initials.append(firstName.charAt(0));
        }
        
        if (lastName != null && !lastName.isEmpty()) {
            initials.append(lastName.charAt(0));
        }
        
        if (initials.length() == 0 && username != null && !username.isEmpty()) {
            initials.append(username.charAt(0));
        }
        
        return initials.toString().toUpperCase();
    }
}

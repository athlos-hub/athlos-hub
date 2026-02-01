package br.com.athloshub.social_service.client;

import br.com.athloshub.social_service.dto.auth.OrganizationDTO;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;
import java.util.UUID;

@FeignClient(
    name = "auth-service",
    url = "${services.auth-service.url}",
    configuration = AuthServiceClientConfiguration.class
)
public interface AuthServiceClient {
    
    @GetMapping("/api/v1/users/{userId}")
    UserDTO getUserById(
        @PathVariable("userId") UUID userId,
        @RequestHeader("Authorization") String authorization
    );
    
    @GetMapping("/api/v1/users")
    List<UserDTO> getAllUsers(
        @RequestHeader("Authorization") String authorization
    );
    
    @GetMapping("/api/v1/organizations/{orgSlug}")
    OrganizationDTO getOrganizationBySlug(
        @PathVariable("orgSlug") String orgSlug,
        @RequestHeader("Authorization") String authorization
    );
    
    @GetMapping("/api/v1/organizations/me")
    List<OrganizationDTO> getMyOrganizations(
        @RequestHeader("Authorization") String authorization
    );
}

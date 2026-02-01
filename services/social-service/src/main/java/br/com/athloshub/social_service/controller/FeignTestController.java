package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.dto.auth.OrganizationDTO;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import br.com.athloshub.social_service.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/social/test/feign")
public class FeignTestController {
    
    private final AuthServiceClient authServiceClient;
    
    public FeignTestController(AuthServiceClient authServiceClient) {
        this.authServiceClient = authServiceClient;
    }
    
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(
        @PathVariable UUID userId,
        @RequestHeader("Authorization") String authorization
    ) {
        UserDTO user = authServiceClient.getUserById(userId, authorization);
        return ResponseEntity.ok(ApiResponse.success(user));
    }
    
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers(
        @RequestHeader("Authorization") String authorization
    ) {
        List<UserDTO> users = authServiceClient.getAllUsers(authorization);
        return ResponseEntity.ok(ApiResponse.success(users));
    }
    
    @GetMapping("/organizations/{orgSlug}")
    public ResponseEntity<ApiResponse<OrganizationDTO>> getOrganizationBySlug(
        @PathVariable String orgSlug,
        @RequestHeader("Authorization") String authorization
    ) {
        OrganizationDTO org = authServiceClient.getOrganizationBySlug(orgSlug, authorization);
        return ResponseEntity.ok(ApiResponse.success(org));
    }
    
    @GetMapping("/organizations/me")
    public ResponseEntity<ApiResponse<List<OrganizationDTO>>> getMyOrganizations(
        @RequestHeader("Authorization") String authorization
    ) {
        List<OrganizationDTO> orgs = authServiceClient.getMyOrganizations(authorization);
        return ResponseEntity.ok(ApiResponse.success(orgs));
    }
}

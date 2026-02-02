package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "organization_follows",
    uniqueConstraints = @UniqueConstraint(columnNames = {"follower_keycloak_id", "organization_slug"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationFollow extends BaseEntity {
    
    @Column(name = "follower_keycloak_id", nullable = false)
    private String followerKeycloakId;
    
    @Column(name = "organization_slug", nullable = false)
    private String organizationSlug;
}

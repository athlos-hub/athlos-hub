package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "follows",
    uniqueConstraints = @UniqueConstraint(columnNames = {"follower_keycloak_id", "following_keycloak_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Follow extends BaseEntity {
    
    @Column(name = "follower_keycloak_id", nullable = false)
    private String followerKeycloakId;
    
    @Column(name = "following_keycloak_id", nullable = false)
    private String followingKeycloakId;
}

package br.com.athloshub.social_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "team_follows",
    uniqueConstraints = @UniqueConstraint(columnNames = {"follower_keycloak_id", "team_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamFollow extends BaseEntity {

    @Column(name = "follower_keycloak_id", nullable = false)
    private String followerKeycloakId;

    @Column(name = "team_id", nullable = false)
    private String teamId;
}

package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.TeamFollow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamFollowRepository extends JpaRepository<TeamFollow, UUID> {

    Optional<TeamFollow> findByFollowerKeycloakIdAndTeamId(String followerKeycloakId, String teamId);

    boolean existsByFollowerKeycloakIdAndTeamId(String followerKeycloakId, String teamId);

    long countByTeamId(String teamId);

    Page<TeamFollow> findByTeamId(String teamId, Pageable pageable);

    Page<TeamFollow> findByFollowerKeycloakId(String followerKeycloakId, Pageable pageable);
}

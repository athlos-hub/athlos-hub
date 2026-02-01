package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.Follow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowRepository extends JpaRepository<Follow, UUID> {
    
    Optional<Follow> findByFollowerKeycloakIdAndFollowingKeycloakId(
        String followerKeycloakId,
        String followingKeycloakId
    );
    
    boolean existsByFollowerKeycloakIdAndFollowingKeycloakId(
        String followerKeycloakId,
        String followingKeycloakId
    );
    
    long countByFollowerKeycloakId(String followerKeycloakId);
    
    long countByFollowingKeycloakId(String followingKeycloakId);
    
    Page<Follow> findByFollowerKeycloakId(String followerKeycloakId, Pageable pageable);
    
    Page<Follow> findByFollowingKeycloakId(String followingKeycloakId, Pageable pageable);
    
    @Query("SELECT f.followingKeycloakId FROM Follow f WHERE f.followerKeycloakId = :keycloakId")
    List<String> findFollowingIdsByKeycloakId(@Param("keycloakId") String keycloakId);
    
    void deleteByFollowerKeycloakIdAndFollowingKeycloakId(
        String followerKeycloakId,
        String followingKeycloakId
    );
}

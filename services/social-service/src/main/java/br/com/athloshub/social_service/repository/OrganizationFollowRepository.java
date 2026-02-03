package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.OrganizationFollow;
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
public interface OrganizationFollowRepository extends JpaRepository<OrganizationFollow, UUID> {
    
    Optional<OrganizationFollow> findByFollowerKeycloakIdAndOrganizationSlug(
        String followerKeycloakId,
        String organizationSlug
    );
    
    boolean existsByFollowerKeycloakIdAndOrganizationSlug(
        String followerKeycloakId,
        String organizationSlug
    );
    
    long countByOrganizationSlug(String organizationSlug);
    
    Page<OrganizationFollow> findByFollowerKeycloakId(String followerKeycloakId, Pageable pageable);
    
    Page<OrganizationFollow> findByOrganizationSlug(String organizationSlug, Pageable pageable);
    
    @Query("SELECT of.organizationSlug FROM OrganizationFollow of WHERE of.followerKeycloakId = :keycloakId")
    List<String> findOrganizationSlugsByFollowerKeycloakId(@Param("keycloakId") String followerKeycloakId);
    
    void deleteByFollowerKeycloakIdAndOrganizationSlug(
        String followerKeycloakId,
        String organizationSlug
    );
}

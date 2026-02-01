package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.OrganizationProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationProfileRepository extends JpaRepository<OrganizationProfile, UUID> {
    
    Optional<OrganizationProfile> findByOrganizationSlug(String organizationSlug);
    
    boolean existsByOrganizationSlug(String organizationSlug);
}

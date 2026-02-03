package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.TeamProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamProfileRepository extends JpaRepository<TeamProfile, UUID> {
    
    Optional<TeamProfile> findByTeamId(String teamId);
    
    List<TeamProfile> findByOrganizationSlug(String organizationSlug);
    
    boolean existsByTeamId(String teamId);
}

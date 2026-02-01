package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.AthleteProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AthleteProfileRepository extends JpaRepository<AthleteProfile, UUID> {
    
    Optional<AthleteProfile> findByKeycloakId(String keycloakId);
    
    boolean existsByKeycloakId(String keycloakId);
}

package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.Like;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LikeRepository extends JpaRepository<Like, UUID> {
    
    Optional<Like> findByKeycloakIdAndPostId(String keycloakId, UUID postId);
    
    boolean existsByKeycloakIdAndPostId(String keycloakId, UUID postId);
    
    long countByPostId(UUID postId);
    
    void deleteByKeycloakIdAndPostId(String keycloakId, UUID postId);
}

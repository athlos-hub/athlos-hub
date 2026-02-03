package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.Share;
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
public interface ShareRepository extends JpaRepository<Share, UUID> {
    
    Optional<Share> findByKeycloakIdAndPostId(String keycloakId, UUID postId);
    
    boolean existsByKeycloakIdAndPostId(String keycloakId, UUID postId);
    
    Page<Share> findByKeycloakIdOrderByCreatedAtDesc(String keycloakId, Pageable pageable);
    
    long countByPostId(UUID postId);
    
    @Query("SELECT s FROM Share s WHERE s.keycloakId = :keycloakId ORDER BY s.createdAt DESC")
    List<Share> findAllByKeycloakId(@Param("keycloakId") String keycloakId);
    
    void deleteByKeycloakIdAndPostId(String keycloakId, UUID postId);
}

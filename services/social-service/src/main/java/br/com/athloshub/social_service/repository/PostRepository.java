package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
    
    Page<Post> findByKeycloakIdOrderByCreatedAtDesc(String keycloakId, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.keycloakId IN :keycloakIds AND p.visibility = 'PUBLIC' ORDER BY p.createdAt DESC")
    Page<Post> findByKeycloakIdInOrderByCreatedAtDesc(@Param("keycloakIds") java.util.List<String> keycloakIds, Pageable pageable);
    
    @Query("SELECT COUNT(p) FROM Post p WHERE p.keycloakId = :keycloakId")
    long countByKeycloakId(@Param("keycloakId") String keycloakId);
}

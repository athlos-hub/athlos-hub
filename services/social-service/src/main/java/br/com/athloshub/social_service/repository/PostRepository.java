package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
    
    Page<Post> findByProfileTypeAndProfileIdOrderByCreatedAtDesc(
        Post.ProfileType profileType,
        String profileId,
        Pageable pageable
    );
    
    @Query("SELECT p FROM Post p WHERE p.profileType = :profileType AND p.profileId IN :profileIds AND p.visibility = 'PUBLIC' ORDER BY p.createdAt DESC")
    Page<Post> findByProfileTypeAndProfileIdInOrderByCreatedAtDesc(
        @Param("profileType") Post.ProfileType profileType,
        @Param("profileIds") List<String> profileIds,
        Pageable pageable
    );
    
    @Query("SELECT p FROM Post p WHERE p.profileType = :profileType AND p.profileId IN :profileIds AND p.visibility = :visibility ORDER BY p.createdAt DESC")
    List<Post> findByProfileTypeAndProfileIdInAndVisibilityOrderByCreatedAtDesc(
        @Param("profileType") Post.ProfileType profileType,
        @Param("profileIds") List<String> profileIds,
        @Param("visibility") Post.PostVisibility visibility
    );
    
    @Query("SELECT COUNT(p) FROM Post p WHERE p.profileType = :profileType AND p.profileId = :profileId")
    long countByProfileTypeAndProfileId(
        @Param("profileType") Post.ProfileType profileType,
        @Param("profileId") String profileId
    );
    
    @Query("SELECT p FROM Post p WHERE p.visibility = 'PUBLIC' ORDER BY p.createdAt DESC")
    Page<Post> findPublicPostsOrderByCreatedAtDesc(Pageable pageable);
}

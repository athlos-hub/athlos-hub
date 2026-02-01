package br.com.athloshub.social_service.repository;

import br.com.athloshub.social_service.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    
    Page<Comment> findByPostIdOrderByCreatedAtDesc(UUID postId, Pageable pageable);
    
    long countByPostId(UUID postId);
}

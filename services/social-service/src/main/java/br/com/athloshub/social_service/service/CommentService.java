package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Comment;
import br.com.athloshub.social_service.enums.NotificationType;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.moderation.ModerationService;
import br.com.athloshub.social_service.repository.CommentRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationService notificationService;
    private final ModerationService moderationService;

    @Transactional
    public Comment createComment(UUID postId, String content) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        moderationService.assertAllowed(content);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Post não encontrado"));

        Comment comment = Comment.builder()
                .keycloakId(keycloakId)
                .post(post)
                .content(content)
                .build();

        Comment savedComment = commentRepository.save(comment);

        post.setCommentsCount(post.getCommentsCount() + 1);
        postRepository.save(post);
        
        try {
            java.util.Map<String, Object> notificationData = new java.util.HashMap<>();
            notificationData.put("actorName", "Usuário");
            notificationData.put("commentContent", content);
            notificationData.put("postContent", post.getContent());
            notificationData.put("postUrl", "https://athlos-hub.com/social/post/" + post.getId());
            notificationData.put("actionUrl", "https://athlos-hub.com/social/post/" + post.getId());
            
            notificationService.createNotification(
                post.getCreatedByKeycloakId(),
                keycloakId,
                NotificationType.POST_COMMENT,
                post.getId(),
                "post",
                "comentou no seu post",
                notificationData
            );
        } catch (Exception e) {
            log.error("Erro ao criar notificação de comentário", e);
        }
        
        return savedComment;
    }

    @Transactional(readOnly = true)
    public Page<Comment> getCommentsByPostId(UUID postId, Pageable pageable) {
        return commentRepository.findByPostIdOrderByCreatedAtDesc(postId, pageable);
    }

    @Transactional
    public Comment updateComment(UUID postId, UUID commentId, String content) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Comentário não encontrado"));


        if (comment.getPost() == null || !comment.getPost().getId().equals(postId)) {
            throw new ResponseStatusException(NOT_FOUND, "Comentário não encontrado neste post");
        }

        if (!comment.getKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para editar este comentário");
        }

        // modera ao editar
        moderationService.assertAllowed(content);

        comment.setContent(content);
        comment.setIsEdited(true);

        return commentRepository.save(comment);
    }

    @Transactional
    public void deleteComment(UUID postId, UUID commentId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Comentário não encontrado"));

        if (comment.getPost() == null || !comment.getPost().getId().equals(postId)) {
            throw new ResponseStatusException(NOT_FOUND, "Comentário não encontrado neste post");
        }

        if (!comment.getKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para deletar este comentário");
        }

        Post post = comment.getPost();
        commentRepository.delete(comment);

        post.setCommentsCount(Math.max(0, post.getCommentsCount() - 1));
        postRepository.save(post);
    }
}

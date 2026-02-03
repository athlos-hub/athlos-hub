package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Comment;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.moderation.ModerationService;
import br.com.athloshub.social_service.repository.CommentRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final JwtTokenProvider jwtTokenProvider;
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

        return savedComment;
    }

    @Transactional(readOnly = true)
    public Page<Comment> getCommentsByPostId(UUID postId, Pageable pageable) {
        return commentRepository.findByPostIdOrderByCreatedAtDesc(postId, pageable);
    }

    @Transactional
    public Comment updateComment(UUID commentId, String content) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Comentário não encontrado"));

        if (!comment.getKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para editar este comentário");
        }

        // Re-modera ao editar
        moderationService.assertAllowed(content);

        comment.setContent(content);
        comment.setIsEdited(true);

        return commentRepository.save(comment);
    }

    @Transactional
    public void deleteComment(UUID commentId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Comentário não encontrado"));

        if (!comment.getKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para deletar este comentário");
        }

        Post post = comment.getPost();
        commentRepository.delete(comment);

        post.setCommentsCount(Math.max(0, post.getCommentsCount() - 1));
        postRepository.save(post);
    }
}

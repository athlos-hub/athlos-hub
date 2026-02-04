package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Comment;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.enums.NotificationType;
import br.com.athloshub.social_service.moderation.ModerationService;
import br.com.athloshub.social_service.repository.CommentRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock CommentRepository commentRepository;
    @Mock PostRepository postRepository;
    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock NotificationService notificationService;
    @Mock ModerationService moderationService;

    @InjectMocks CommentService service;

    @Captor ArgumentCaptor<Post> postCaptor;
    @Captor ArgumentCaptor<Comment> commentCaptor;

    UUID postId;
    UUID commentId;
    Post post;

    @BeforeEach
    void setup() {
        postId = UUID.randomUUID();
        commentId = UUID.randomUUID();

        post = Post.builder()
                .profileType(Post.ProfileType.ORGANIZATION)
                .profileId("org-1")
                .createdByKeycloakId("kc-owner-post")
                .content("post content")
                .commentsCount(0)
                .build();
        post.setId(postId);
    }

    // -------------------- createComment --------------------

    @Test
    void createComment_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.createComment(postId, "oi"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(moderationService);
        verifyNoInteractions(postRepository);
        verifyNoInteractions(commentRepository);
        verifyNoInteractions(notificationService);
    }

    @Test
    void createComment_whenPostNotFound_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        doNothing().when(moderationService).assertAllowed("oi");
        when(postRepository.findById(postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createComment(postId, "oi"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verify(moderationService).assertAllowed("oi");
        verify(commentRepository, never()).save(any());
        verify(postRepository, never()).save(any(Post.class));
        verifyNoInteractions(notificationService);
    }

    @Test
    void createComment_shouldModerateSave_incrementCommentsCount_andCreateNotification() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        doNothing().when(moderationService).assertAllowed("comment text");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));

        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(commentId);
            return c;
        });

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        Comment saved = service.createComment(postId, "comment text");

        assertThat(saved.getId()).isEqualTo(commentId);

        // comentario criado com dados corretos
        verify(commentRepository).save(commentCaptor.capture());
        Comment created = commentCaptor.getValue();
        assertThat(created.getKeycloakId()).isEqualTo("kc-actor");
        assertThat(created.getPost()).isSameAs(post);
        assertThat(created.getContent()).isEqualTo("comment text");

        // contador incrementado e post salvo
        verify(postRepository).save(postCaptor.capture());
        Post savedPost = postCaptor.getValue();
        assertThat(savedPost.getCommentsCount()).isEqualTo(1);

        // notificação chamada (não precisa validar o map todo)
        verify(notificationService).createNotification(
                eq("kc-owner-post"),
                eq("kc-actor"),
                eq(NotificationType.POST_COMMENT),
                eq(postId),
                eq("post"),
                anyString(),
                anyMap()
        );
    }

    @Test
    void createComment_whenNotificationFails_shouldNotThrow_andStillReturnComment() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        doNothing().when(moderationService).assertAllowed(anyString());
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));

        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(commentId);
            return c;
        });

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        doThrow(new RuntimeException("boom"))
                .when(notificationService)
                .createNotification(anyString(), anyString(), any(), any(), anyString(), anyString(), anyMap());

        Comment saved = service.createComment(postId, "comment text");

        assertThat(saved.getId()).isEqualTo(commentId);
        verify(commentRepository).save(any(Comment.class));
        verify(postRepository).save(any(Post.class));
        verify(notificationService).createNotification(
                anyString(), anyString(), any(), any(), anyString(), anyString(), anyMap()
        );
    }

    // -------------------- updateComment --------------------

    @Test
    void updateComment_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.updateComment(postId, commentId, "new"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(commentRepository);
        verifyNoInteractions(moderationService);
    }

    @Test
    void updateComment_whenCommentNotFound_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        when(commentRepository.findById(commentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateComment(postId, commentId, "new"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verifyNoInteractions(moderationService);
    }

    @Test
    void updateComment_whenCommentNotInPost_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");

        Post otherPost = Post.builder().content("x").build();
        otherPost.setId(UUID.randomUUID());

        Comment comment = Comment.builder()
                .id(commentId)
                .keycloakId("kc-actor")
                .post(otherPost)
                .content("old")
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.updateComment(postId, commentId, "new"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verifyNoInteractions(moderationService);
        verify(commentRepository, never()).save(any());
    }

    @Test
    void updateComment_whenNotOwner_shouldThrow403() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-other");

        Comment comment = Comment.builder()
                .id(commentId)
                .keycloakId("kc-owner")
                .post(post)
                .content("old")
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.updateComment(postId, commentId, "new"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(FORBIDDEN);

        verifyNoInteractions(moderationService);
        verify(commentRepository, never()).save(any());
    }

    @Test
    void updateComment_whenOwner_shouldModerate_setEdited_andSave() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");

        Comment comment = Comment.builder()
                .id(commentId)
                .keycloakId("kc-actor")
                .post(post)
                .content("old")
                .isEdited(false)
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        doNothing().when(moderationService).assertAllowed("new text");
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        Comment updated = service.updateComment(postId, commentId, "new text");

        assertThat(updated.getContent()).isEqualTo("new text");
        assertThat(updated.getIsEdited()).isTrue();

        verify(moderationService).assertAllowed("new text");
        verify(commentRepository).save(comment);
    }

    // -------------------- deleteComment --------------------

    @Test
    void deleteComment_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.deleteComment(postId, commentId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(commentRepository);
        verifyNoInteractions(postRepository);
    }

    @Test
    void deleteComment_whenCommentNotFound_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        when(commentRepository.findById(commentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteComment(postId, commentId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verifyNoInteractions(postRepository);
    }

    @Test
    void deleteComment_whenCommentNotInPost_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");

        Post otherPost = Post.builder().content("x").build();
        otherPost.setId(UUID.randomUUID());

        Comment comment = Comment.builder()
                .id(commentId)
                .keycloakId("kc-actor")
                .post(otherPost)
                .content("old")
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.deleteComment(postId, commentId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verify(commentRepository, never()).delete(any());
        verify(postRepository, never()).save(any());
    }

    @Test
    void deleteComment_whenNotOwner_shouldThrow403() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-other");

        Comment comment = Comment.builder()
                .id(commentId)
                .keycloakId("kc-owner")
                .post(post)
                .content("old")
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.deleteComment(postId, commentId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(FORBIDDEN);

        verify(commentRepository, never()).delete(any());
        verify(postRepository, never()).save(any());
    }

    @Test
    void deleteComment_shouldDelete_andDecrementCounter_notNegative() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");

        post.setCommentsCount(0);

        Comment comment = Comment.builder()
                .id(commentId)
                .keycloakId("kc-actor")
                .post(post)
                .content("old")
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        doNothing().when(commentRepository).delete(comment);
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        service.deleteComment(postId, commentId);

        verify(commentRepository).delete(comment);
        verify(postRepository).save(postCaptor.capture());
        assertThat(postCaptor.getValue().getCommentsCount()).isEqualTo(0);
    }
}

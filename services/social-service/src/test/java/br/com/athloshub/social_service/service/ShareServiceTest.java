package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.entity.Share;
import br.com.athloshub.social_service.enums.NotificationType;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.repository.ShareRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.*;

@ExtendWith(MockitoExtension.class)
class ShareServiceTest {

    @Mock ShareRepository shareRepository;
    @Mock PostRepository postRepository;
    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock NotificationService notificationService;

    @InjectMocks ShareService service;

    @Captor ArgumentCaptor<Share> shareCaptor;
    @Captor ArgumentCaptor<Post> postCaptor;

    UUID postId;
    UUID shareId;
    Post post;

    @BeforeEach
    void setup() {
        postId = UUID.randomUUID();
        shareId = UUID.randomUUID();

        post = Post.builder()
                .profileType(Post.ProfileType.ORGANIZATION)
                .profileId("org-1")
                .createdByKeycloakId("kc-owner-post")
                .content("post content")
                .sharesCount(0)
                .build();
        post.setId(postId);
    }

    @Test
    void sharePost_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.sharePost(postId, "x"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(postRepository);
        verifyNoInteractions(shareRepository);
        verifyNoInteractions(notificationService);
    }

    @Test
    void sharePost_whenPostNotFound_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        when(postRepository.findById(postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.sharePost(postId, "x"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verify(shareRepository, never()).existsByKeycloakIdAndPostId(anyString(), any());
        verify(shareRepository, never()).save(any());
        verify(postRepository, never()).save(any(Post.class));
        verifyNoInteractions(notificationService);
    }

    @Test
    void sharePost_whenAlreadyShared_shouldThrow400() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(shareRepository.existsByKeycloakIdAndPostId("kc-actor", postId)).thenReturn(true);

        assertThatThrownBy(() -> service.sharePost(postId, "x"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(BAD_REQUEST);

        verify(shareRepository, never()).save(any());
        verify(postRepository, never()).save(any(Post.class));
        verifyNoInteractions(notificationService);
    }

    @Test
    void sharePost_shouldSaveShare_incrementCounter_savePost_andReturnShare() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(shareRepository.existsByKeycloakIdAndPostId("kc-actor", postId)).thenReturn(false);

        when(shareRepository.save(any(Share.class))).thenAnswer(inv -> {
            Share s = inv.getArgument(0);
            s.setId(shareId);
            return s;
        });
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        Share saved = service.sharePost(postId, "my comment");

        assertThat(saved.getId()).isEqualTo(shareId);

        verify(shareRepository).save(shareCaptor.capture());
        Share created = shareCaptor.getValue();
        assertThat(created.getKeycloakId()).isEqualTo("kc-actor");
        assertThat(created.getPost()).isSameAs(post);
        assertThat(created.getComment()).isEqualTo("my comment");

        verify(postRepository).save(postCaptor.capture());
        assertThat(postCaptor.getValue().getSharesCount()).isEqualTo(1);

        verify(notificationService).createNotification(
                eq("kc-owner-post"),
                eq("kc-actor"),
                eq(NotificationType.POST_SHARE),
                eq(postId),
                eq("post"),
                eq("compartilhou seu post"),
                anyMap()
        );
    }

    @Test
    void sharePost_whenNotificationThrows_shouldStillReturnShare() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(shareRepository.existsByKeycloakIdAndPostId("kc-actor", postId)).thenReturn(false);

        when(shareRepository.save(any(Share.class))).thenAnswer(inv -> {
            Share s = inv.getArgument(0);
            s.setId(shareId);
            return s;
        });
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        doThrow(new RuntimeException("boom")).when(notificationService).createNotification(
                anyString(), anyString(), any(), any(), anyString(), anyString(), anyMap()
        );

        Share saved = service.sharePost(postId, "");

        assertThat(saved.getId()).isEqualTo(shareId);
        verify(shareRepository).save(any());
        verify(postRepository).save(any());
    }

    @Test
    void unsharePost_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.unsharePost(postId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(shareRepository);
        verifyNoInteractions(postRepository);
    }

    @Test
    void unsharePost_whenShareNotFound_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        when(shareRepository.findByKeycloakIdAndPostId("kc-actor", postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.unsharePost(postId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verify(shareRepository, never()).delete(any());
        verify(postRepository, never()).save(any());
    }

    @Test
    void unsharePost_shouldDeleteShare_decrementCounter_notNegative_andSavePost() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");

        post.setSharesCount(0);

        Share share = Share.builder()
                .keycloakId("kc-actor")
                .post(post)
                .comment("x")
                .build();
        share.setId(shareId);

        when(shareRepository.findByKeycloakIdAndPostId("kc-actor", postId)).thenReturn(Optional.of(share));
        doNothing().when(shareRepository).delete(share);
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        service.unsharePost(postId);

        verify(shareRepository).delete(share);
        verify(postRepository).save(postCaptor.capture());
        assertThat(postCaptor.getValue().getSharesCount()).isEqualTo(0);
    }


    @Test
    void hasShared_whenNotAuthenticated_shouldReturnFalse_andNotHitRepo() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        boolean result = service.hasShared(postId);

        assertThat(result).isFalse();
        verifyNoInteractions(shareRepository);
    }

    @Test
    void hasShared_whenAuthenticated_shouldDelegateToRepo() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");
        when(shareRepository.existsByKeycloakIdAndPostId("kc-actor", postId)).thenReturn(true);

        boolean result = service.hasShared(postId);

        assertThat(result).isTrue();
        verify(shareRepository).existsByKeycloakIdAndPostId("kc-actor", postId);
    }


    @Test
    void getMyShares_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.getMyShares(PageRequest.of(0, 10)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(shareRepository);
    }

    @Test
    void getMyShares_whenAuthenticated_shouldDelegateToRepo() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-actor");

        Pageable pageable = PageRequest.of(0, 10);
        Page<Share> repoPage = new PageImpl<>(java.util.List.of());
        when(shareRepository.findByKeycloakIdOrderByCreatedAtDesc("kc-actor", pageable)).thenReturn(repoPage);

        Page<Share> result = service.getMyShares(pageable);

        assertThat(result).isSameAs(repoPage);
        verify(shareRepository).findByKeycloakIdOrderByCreatedAtDesc("kc-actor", pageable);
    }

    @Test
    void getUserShares_shouldDelegateToRepo() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Share> repoPage = new PageImpl<>(java.util.List.of());
        when(shareRepository.findByKeycloakIdOrderByCreatedAtDesc("kc-x", pageable)).thenReturn(repoPage);

        Page<Share> result = service.getUserShares("kc-x", pageable);

        assertThat(result).isSameAs(repoPage);
        verify(shareRepository).findByKeycloakIdOrderByCreatedAtDesc("kc-x", pageable);
    }

    @Test
    void getShareCount_shouldDelegateToRepo() {
        when(shareRepository.countByPostId(postId)).thenReturn(9L);

        long count = service.getShareCount(postId);

        assertThat(count).isEqualTo(9L);
        verify(shareRepository).countByPostId(postId);
    }
}

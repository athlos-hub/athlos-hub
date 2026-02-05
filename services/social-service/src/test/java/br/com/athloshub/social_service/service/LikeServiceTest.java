package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Like;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.repository.LikeRepository;
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
class LikeServiceTest {

    @Mock LikeRepository likeRepository;
    @Mock PostRepository postRepository;
    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock NotificationService notificationService;

    @InjectMocks LikeService service;

    @Captor ArgumentCaptor<Post> postCaptor;
    @Captor ArgumentCaptor<Like> likeCaptor;

    UUID postId;
    Post post;

    @BeforeEach
    void setup() {
        postId = UUID.randomUUID();

        post = Post.builder()
                .profileType(Post.ProfileType.ORGANIZATION)
                .profileId("org-1")
                .createdByKeycloakId("kc-owner")
                .content("post")
                .likesCount(0)
                .build();
        post.setId(postId);
    }

    @Test
    void toggleLike_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.toggleLike(postId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(postRepository);
        verifyNoInteractions(likeRepository);
        verifyNoInteractions(notificationService);
    }

    @Test
    void toggleLike_whenPostNotFound_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-1");
        when(postRepository.findById(postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.toggleLike(postId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verify(likeRepository, never()).findByKeycloakIdAndPostId(anyString(), any());
        verify(likeRepository, never()).save(any());
        verify(likeRepository, never()).delete(any());
        verify(postRepository, never()).save(any());

        verifyNoInteractions(notificationService);
    }

    @Test
    void toggleLike_whenLikeExists_shouldDelete_decrementNotNegative_savePost_andReturnFalse() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-1");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));


        post.setLikesCount(0);

        Like existingLike = Like.builder()
                .keycloakId("kc-1")
                .post(post)
                .build();
        existingLike.setId(UUID.randomUUID());

        when(likeRepository.findByKeycloakIdAndPostId("kc-1", postId))
                .thenReturn(Optional.of(existingLike));

        doNothing().when(likeRepository).delete(existingLike);
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean liked = service.toggleLike(postId);

        assertThat(liked).isFalse();

        verify(likeRepository).delete(existingLike);
        verify(postRepository).save(postCaptor.capture());
        assertThat(postCaptor.getValue().getLikesCount()).isEqualTo(0); // não fica negativo
        verify(likeRepository, never()).save(any());

        verifyNoInteractions(notificationService);
    }

    @Test
    void toggleLike_whenLikeDoesNotExist_shouldCreate_increment_savePost_andReturnTrue() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-1");
        when(postRepository.findById(postId)).thenReturn(Optional.of(post));

        when(likeRepository.findByKeycloakIdAndPostId("kc-1", postId))
                .thenReturn(Optional.empty());

        when(likeRepository.save(any(Like.class))).thenAnswer(inv -> {
            Like l = inv.getArgument(0);
            l.setId(UUID.randomUUID());
            return l;
        });

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean liked = service.toggleLike(postId);

        assertThat(liked).isTrue();

        verify(likeRepository).save(likeCaptor.capture());
        Like created = likeCaptor.getValue();
        assertThat(created.getKeycloakId()).isEqualTo("kc-1");
        assertThat(created.getPost()).isSameAs(post);

        verify(postRepository).save(postCaptor.capture());
        assertThat(postCaptor.getValue().getLikesCount()).isEqualTo(1);

        verify(likeRepository, never()).delete(any());

    }


    @Test
    void isLikedByCurrentUser_whenNotAuthenticated_shouldReturnFalse_andNotHitRepo() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        boolean result = service.isLikedByCurrentUser(postId);

        assertThat(result).isFalse();
        verifyNoInteractions(likeRepository);
        verifyNoInteractions(notificationService);
    }

    @Test
    void isLikedByCurrentUser_whenAuthenticated_shouldReturnRepoResult() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-1");
        when(likeRepository.existsByKeycloakIdAndPostId("kc-1", postId)).thenReturn(true);

        boolean result = service.isLikedByCurrentUser(postId);

        assertThat(result).isTrue();
        verify(likeRepository).existsByKeycloakIdAndPostId("kc-1", postId);

        verifyNoInteractions(notificationService);
    }


    @Test
    void getLikesCount_shouldReturnCountByPostId() {
        when(likeRepository.countByPostId(postId)).thenReturn(7L);

        long count = service.getLikesCount(postId);

        assertThat(count).isEqualTo(7L);
        verify(likeRepository).countByPostId(postId);

        verifyNoInteractions(notificationService);
    }
}

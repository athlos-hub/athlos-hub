package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.repository.FollowRepository;
import br.com.athloshub.social_service.repository.OrganizationFollowRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    @Mock PostRepository postRepository;
    @Mock FollowRepository followRepository;
    @Mock OrganizationFollowRepository organizationFollowRepository;
    @Mock JwtTokenProvider jwtTokenProvider;

    @InjectMocks FeedService service;

    String me;

    @BeforeEach
    void setup() {
        me = "kc-me";
    }

    @Test
    void getMyFeed_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.getMyFeed(PageRequest.of(0, 10)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(followRepository);
        verifyNoInteractions(organizationFollowRepository);
        verifyNoInteractions(postRepository);
    }

    @Test
    void getMyFeed_shouldFetchAthleteAndOrgPosts_sortByCreatedAtDesc_andPaginate() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        when(followRepository.findFollowingIdsByKeycloakId(me)).thenReturn(new java.util.ArrayList<>(List.of("kc-a1", "kc-a2")));
        when(organizationFollowRepository.findOrganizationSlugsByFollowerKeycloakId(me)).thenReturn(List.of("org-1"));

        Post p1 = postWithCreatedAt(Post.ProfileType.ATHLETE, "kc-a1", LocalDateTime.parse("2026-01-01T10:00:00"));
        Post p2 = postWithCreatedAt(Post.ProfileType.ORGANIZATION, "org-1", LocalDateTime.parse("2026-01-03T10:00:00"));
        Post p3 = postWithCreatedAt(Post.ProfileType.ATHLETE, me, LocalDateTime.parse("2026-01-02T10:00:00"));

        when(postRepository.findByProfileTypeAndProfileIdInAndVisibilityOrderByCreatedAtDesc(
                eq(Post.ProfileType.ATHLETE),
                anyList(),
                eq(Post.PostVisibility.PUBLIC)
        )).thenReturn(List.of(p1, p3));

        when(postRepository.findByProfileTypeAndProfileIdInAndVisibilityOrderByCreatedAtDesc(
                eq(Post.ProfileType.ORGANIZATION),
                anyList(),
                eq(Post.PostVisibility.PUBLIC)
        )).thenReturn(List.of(p2));

        Pageable pageable = PageRequest.of(0, 2);
        Page<Post> page = service.getMyFeed(pageable);

        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent()).hasSize(2);

        assertThat(page.getContent().get(0).getCreatedAt()).isEqualTo(LocalDateTime.parse("2026-01-03T10:00:00"));
        assertThat(page.getContent().get(1).getCreatedAt()).isEqualTo(LocalDateTime.parse("2026-01-02T10:00:00"));

        verify(followRepository).findFollowingIdsByKeycloakId(me);
        verify(organizationFollowRepository).findOrganizationSlugsByFollowerKeycloakId(me);

        verify(postRepository).findByProfileTypeAndProfileIdInAndVisibilityOrderByCreatedAtDesc(
                eq(Post.ProfileType.ATHLETE),
                argThat(list -> list.containsAll(List.of("kc-a1", "kc-a2", me))),
                eq(Post.PostVisibility.PUBLIC)
        );
        verify(postRepository).findByProfileTypeAndProfileIdInAndVisibilityOrderByCreatedAtDesc(
                eq(Post.ProfileType.ORGANIZATION),
                eq(List.of("org-1")),
                eq(Post.PostVisibility.PUBLIC)
        );
    }

    @Test
    void getMyFeed_whenPageOutOfRange_shouldReturnEmptyPage() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        when(followRepository.findFollowingIdsByKeycloakId(me)).thenReturn(new java.util.ArrayList<>(List.of("kc-a1")));
        when(organizationFollowRepository.findOrganizationSlugsByFollowerKeycloakId(me)).thenReturn(List.of());

        Post p1 = postWithCreatedAt(Post.ProfileType.ATHLETE, "kc-a1", LocalDateTime.parse("2026-01-01T10:00:00"));

        when(postRepository.findByProfileTypeAndProfileIdInAndVisibilityOrderByCreatedAtDesc(
                eq(Post.ProfileType.ATHLETE),
                anyList(),
                eq(Post.PostVisibility.PUBLIC)
        )).thenReturn(List.of(p1));

        Pageable pageable = PageRequest.of(2, 10);
        Page<Post> page = service.getMyFeed(pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).isEmpty();
    }

    @Test
    void getMyFeed_whenNoFollowingAndNoOrg_shouldReturnEmptyPage_andNotHitPostRepo() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        when(followRepository.findFollowingIdsByKeycloakId(me)).thenReturn(new java.util.ArrayList<>());
        when(organizationFollowRepository.findOrganizationSlugsByFollowerKeycloakId(me)).thenReturn(List.of());

        Page<Post> page = service.getMyFeed(PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(0);
        assertThat(page.getContent()).isEmpty();

        verifyNoInteractions(postRepository);
    }

    @Test
    void getPublicFeed_shouldDelegateToRepository() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Post> repoPage = new PageImpl<>(List.of());
        when(postRepository.findPublicPostsOrderByCreatedAtDesc(pageable)).thenReturn(repoPage);

        Page<Post> result = service.getPublicFeed(pageable);

        assertThat(result).isSameAs(repoPage);
        verify(postRepository).findPublicPostsOrderByCreatedAtDesc(pageable);
    }

    @Test
    void getFollowingFeed_shouldCallGetMyFeed() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(followRepository.findFollowingIdsByKeycloakId(me)).thenReturn(new java.util.ArrayList<>());
        when(organizationFollowRepository.findOrganizationSlugsByFollowerKeycloakId(me)).thenReturn(List.of());

        Page<Post> result = service.getFollowingFeed(PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(0);
        verify(followRepository).findFollowingIdsByKeycloakId(me);
    }

    private Post postWithCreatedAt(Post.ProfileType type, String profileId, LocalDateTime createdAt) {
        Post p = Post.builder()
                .profileType(type)
                .profileId(profileId)
                .createdByKeycloakId(profileId)
                .content("x")
                .visibility(Post.PostVisibility.PUBLIC)
                .build();
        p.setId(UUID.randomUUID());
        p.setCreatedAt(createdAt);
        return p;
    }
}

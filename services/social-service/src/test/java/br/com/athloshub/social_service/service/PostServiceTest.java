package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.dto.request.CreatePostRequest;
import br.com.athloshub.social_service.entity.AthleteProfile;
import br.com.athloshub.social_service.entity.OrganizationProfile;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.entity.TeamProfile;
import br.com.athloshub.social_service.moderation.ModerationService;
import br.com.athloshub.social_service.repository.AthleteProfileRepository;
import br.com.athloshub.social_service.repository.OrganizationProfileRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.repository.TeamProfileRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.*;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock PostRepository postRepository;
    @Mock AthleteProfileRepository athleteProfileRepository;
    @Mock OrganizationProfileRepository organizationProfileRepository;
    @Mock TeamProfileRepository teamProfileRepository;
    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock ModerationService moderationService;

    @InjectMocks PostService service;

    @Captor ArgumentCaptor<Post> postCaptor;

    UUID postId;
    Post existingPost;

    @BeforeEach
    void setup() {
        postId = UUID.randomUUID();

        existingPost = Post.builder()
                .profileType(Post.ProfileType.ORGANIZATION)
                .profileId("org-1")
                .createdByKeycloakId("kc-owner")
                .content("old")
                .likesCount(0)
                .commentsCount(0)
                .sharesCount(0)
                .visibility(Post.PostVisibility.PUBLIC)
                .type(Post.PostType.TEXT)
                .build();
        existingPost.setId(postId);
    }

    @Test
    void createPost_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.createPost(
                Post.ProfileType.ORGANIZATION,
                "org-1",
                "hello",
                List.of(),
                Post.PostType.TEXT,
                Post.PostVisibility.PUBLIC,
                Map.of()
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(moderationService);
        verifyNoInteractions(postRepository);
    }

    @Test
    void createPost_whenAthleteManualCreation_shouldThrow403() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-1");

        assertThatThrownBy(() -> service.createPost(
                Post.ProfileType.ATHLETE,
                "kc-1",
                "hello",
                List.of(),
                Post.PostType.TEXT,
                Post.PostVisibility.PUBLIC,
                Map.of()
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(FORBIDDEN);

        verifyNoInteractions(moderationService);
        verifyNoInteractions(postRepository);
    }

    @Test
    void createPost_shouldModerate_save_andApplyDefaults_whenTypeOrVisibilityNull() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-creator");
        doNothing().when(moderationService).assertAllowed("conteudo");

        OrganizationProfile org = OrganizationProfile.builder()
                .organizationSlug("org-1")
                .postsCount(0)
                .build();
        when(organizationProfileRepository.findByOrganizationSlug("org-1"))
                .thenReturn(Optional.of(org));
        when(organizationProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> {
            Post p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        Post saved = service.createPost(
                Post.ProfileType.ORGANIZATION,
                "org-1",
                "conteudo",
                List.of("m1"),
                null,
                null,
                Map.of("a", 1)
        );

        assertThat(saved.getId()).isNotNull();
        verify(moderationService).assertAllowed("conteudo");

        verify(postRepository).save(postCaptor.capture());
        Post created = postCaptor.getValue();
        assertThat(created.getType()).isEqualTo(Post.PostType.TEXT);
        assertThat(created.getVisibility()).isEqualTo(Post.PostVisibility.PUBLIC);

        assertThat(org.getPostsCount()).isEqualTo(1);
    }

    @Test
    void createTeamPost_shouldIncrementTeamPostsCount() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-creator");
        doNothing().when(moderationService).assertAllowed(anyString());

        TeamProfile team = TeamProfile.builder().teamId("team-1").postsCount(0).build();
        when(teamProfileRepository.findByTeamId("team-1")).thenReturn(Optional.of(team));
        when(teamProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> {
            Post p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        Post saved = service.createTeamPost("team-1", "ok", List.of(), Post.PostType.TEXT, Post.PostVisibility.PUBLIC, Map.of());

        assertThat(saved.getId()).isNotNull();
        assertThat(team.getPostsCount()).isEqualTo(1);
    }


    @Test
    void createAchievementPost_shouldSaveAchievement_andIncrementAchievementsCount_whenProfileExists() {
        doNothing().when(moderationService).assertAllowed("achv");
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> {
            Post p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        AthleteProfile profile = AthleteProfile.builder()
                .keycloakId("kc-ath")
                .achievementsCount(0)
                .build();
        when(athleteProfileRepository.findByKeycloakId("kc-ath")).thenReturn(Optional.of(profile));
        when(athleteProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Post saved = service.createAchievementPost("kc-ath", "achv", Map.of("medal", "gold"));

        assertThat(saved.getType()).isEqualTo(Post.PostType.ACHIEVEMENT);
        assertThat(saved.getCreatedByKeycloakId()).isEqualTo("SYSTEM");
        assertThat(profile.getAchievementsCount()).isEqualTo(1);

        verify(moderationService).assertAllowed("achv");
        verify(postRepository).save(any(Post.class));
        verify(athleteProfileRepository).save(profile);
    }

    @Test
    void getPostById_whenNotFound_shouldThrow404() {
        when(postRepository.findById(postId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getPostById(postId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);
    }


    @Test
    void updatePost_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.updatePost(postId, "new", null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);
    }

    @Test
    void updatePost_whenNotOwner_shouldThrow403() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-not-owner");
        when(postRepository.findById(postId)).thenReturn(Optional.of(existingPost));

        assertThatThrownBy(() -> service.updatePost(postId, "new", null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(FORBIDDEN);

        verify(moderationService, never()).assertAllowed(anyString());
        verify(postRepository, never()).save(any());
    }

    @Test
    void updatePost_whenOwner_shouldModerateAndSave() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-owner");
        when(postRepository.findById(postId)).thenReturn(Optional.of(existingPost));
        doNothing().when(moderationService).assertAllowed("updated");
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        Post updated = service.updatePost(postId, "updated", List.of("u1"));

        assertThat(updated.getContent()).isEqualTo("updated");
        assertThat(updated.getMediaUrls()).containsExactly("u1");

        verify(moderationService).assertAllowed("updated");
        verify(postRepository).save(existingPost);
    }


    @Test
    void deletePost_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.deletePost(postId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);
    }

    @Test
    void deletePost_whenNotOwnerAndNotSystem_shouldThrow403() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-x");
        when(postRepository.findById(postId)).thenReturn(Optional.of(existingPost));

        assertThatThrownBy(() -> service.deletePost(postId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(FORBIDDEN);

        verify(postRepository, never()).delete(any());
    }

    @Test
    void deletePost_whenSystemPost_shouldAllowEvenIfDifferentUser_andNotGoNegative() {
        existingPost.setCreatedByKeycloakId("SYSTEM");
        existingPost.setProfileType(Post.ProfileType.ORGANIZATION);
        existingPost.setProfileId("org-1");

        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn("kc-any");
        when(postRepository.findById(postId)).thenReturn(Optional.of(existingPost));

        OrganizationProfile org = OrganizationProfile.builder()
                .organizationSlug("org-1")
                .postsCount(0)
                .build();
        when(organizationProfileRepository.findByOrganizationSlug("org-1"))
                .thenReturn(Optional.of(org));
        when(organizationProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        doNothing().when(postRepository).delete(any(Post.class));

        service.deletePost(postId);

        verify(postRepository).delete(existingPost);
        assertThat(org.getPostsCount()).isEqualTo(0); // não pode ficar negativo
    }


    @Test
    void createAthletePost_shouldCreateProfileIfMissing_moderate_save_andIncrementPostsCount() {
        String keycloakId = "kc-ath";

        CreatePostRequest req = new CreatePostRequest();
        req.setContent("hello");
        req.setMediaUrls(List.of());
        req.setType(Post.PostType.TEXT);
        req.setVisibility(Post.PostVisibility.PUBLIC);
        req.setMetadata(Map.of());

        AthleteProfile profile = AthleteProfile.builder().keycloakId(keycloakId).postsCount(0).build();

        when(athleteProfileRepository.findByKeycloakId(keycloakId))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(profile));

        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(moderationService).assertAllowed("hello");
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> {
            Post p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        Post saved = service.createAthletePost(keycloakId, req);

        assertThat(saved.getProfileType()).isEqualTo(Post.ProfileType.ATHLETE);
        assertThat(saved.getProfileId()).isEqualTo(keycloakId);
        assertThat(profile.getPostsCount()).isEqualTo(1);

        verify(moderationService).assertAllowed("hello");
        verify(postRepository).save(any(Post.class));
    }

    @Test
    void deleteAthletePost_whenNotFound_shouldThrow404() {
        UUID id = UUID.randomUUID();
        when(postRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteAthletePost(id, "kc"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);
    }

    @Test
    void deleteAthletePost_whenNotOwner_shouldThrow403() {
        UUID id = UUID.randomUUID();
        Post p = Post.builder()
                .profileType(Post.ProfileType.ATHLETE)
                .profileId("kc-ath")
                .createdByKeycloakId("kc-owner")
                .content("x")
                .build();
        p.setId(id);

        when(postRepository.findById(id)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.deleteAthletePost(id, "kc-other"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(FORBIDDEN);
    }

    @Test
    void deleteAthletePost_whenNotAthletePost_shouldThrow403() {
        UUID id = UUID.randomUUID();
        Post p = Post.builder()
                .profileType(Post.ProfileType.ORGANIZATION)
                .profileId("org")
                .createdByKeycloakId("kc")
                .content("x")
                .build();
        p.setId(id);

        when(postRepository.findById(id)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.deleteAthletePost(id, "kc"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(FORBIDDEN);
    }

    @Test
    void deleteAthletePost_shouldDelete_andDecrementPostsCount_notNegative() {
        UUID id = UUID.randomUUID();
        String keycloakId = "kc-ath";

        Post p = Post.builder()
                .profileType(Post.ProfileType.ATHLETE)
                .profileId(keycloakId)
                .createdByKeycloakId(keycloakId)
                .content("x")
                .build();
        p.setId(id);

        when(postRepository.findById(id)).thenReturn(Optional.of(p));
        doNothing().when(postRepository).delete(p);

        AthleteProfile profile = AthleteProfile.builder().keycloakId(keycloakId).postsCount(0).build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(profile));
        when(athleteProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deleteAthletePost(id, keycloakId);

        verify(postRepository).delete(p);
        assertThat(profile.getPostsCount()).isEqualTo(0);
    }

    @Test
    void sharePost_whenOriginalNotFound_shouldThrow404() {
        UUID originalId = UUID.randomUUID();
        when(postRepository.findById(originalId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.sharePost(originalId, "kc", new CreatePostRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);
    }

    @Test
    void sharePost_shouldCreateSharedPost_incrementOriginalShares_andIncrementAthletePosts() {
        String keycloakId = "kc-ath";
        UUID originalId = UUID.randomUUID();

        Post original = Post.builder()
                .profileType(Post.ProfileType.ORGANIZATION)
                .profileId("org-1")
                .createdByKeycloakId("kc-owner")
                .content("orig")
                .sharesCount(0)
                .build();
        original.setId(originalId);

        when(postRepository.findById(originalId)).thenReturn(Optional.of(original));

        AthleteProfile profile = AthleteProfile.builder().keycloakId(keycloakId).postsCount(0).build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(profile));

        doNothing().when(moderationService).assertAllowed(anyString());

        when(postRepository.save(any(Post.class))).thenAnswer(inv -> {
            Post p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });

        when(athleteProfileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreatePostRequest shareReq = new CreatePostRequest();
        shareReq.setContent("my comment");
        shareReq.setMetadata(Map.of("foo", "bar"));

        Post shared = service.sharePost(originalId, keycloakId, shareReq);

        assertThat(shared.getType()).isEqualTo(Post.PostType.SHARED);
        assertThat(shared.getMetadata()).containsKeys("sharedPostId", "originalAuthor", "originalProfileType");
        assertThat(original.getSharesCount()).isEqualTo(1);
        assertThat(profile.getPostsCount()).isEqualTo(1);

        verify(moderationService).assertAllowed("my comment");
        verify(postRepository, times(2)).save(any(Post.class)); // shared + original atualizado
        verify(athleteProfileRepository).save(profile);
    }
}

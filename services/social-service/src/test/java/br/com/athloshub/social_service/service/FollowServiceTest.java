package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.AthleteProfile;
import br.com.athloshub.social_service.entity.Follow;
import br.com.athloshub.social_service.repository.AthleteProfileRepository;
import br.com.athloshub.social_service.repository.FollowRepository;
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
class FollowServiceTest {

    @Mock FollowRepository followRepository;
    @Mock AthleteProfileRepository athleteProfileRepository;
    @Mock JwtTokenProvider jwtTokenProvider;

    @InjectMocks FollowService service;

    @Captor ArgumentCaptor<Follow> followCaptor;
    @Captor ArgumentCaptor<AthleteProfile> profileCaptor;

    String me;
    String target;

    @BeforeEach
    void setup() {
        me = "kc-me";
        target = "kc-target";
    }

    @Test
    void toggleFollow_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.toggleFollow(target))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(followRepository);
        verifyNoInteractions(athleteProfileRepository);
    }

    @Test
    void toggleFollow_whenFollowSelf_shouldThrow400() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        assertThatThrownBy(() -> service.toggleFollow(me))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(BAD_REQUEST);

        verifyNoInteractions(followRepository);
        verifyNoInteractions(athleteProfileRepository);
    }

    @Test
    void toggleFollow_whenAlreadyFollowing_shouldDeleteAndDecrementCounters_notBelowZero() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        Follow existing = Follow.builder()
                .followerKeycloakId(me)
                .followingKeycloakId(target)
                .build();
        existing.setId(UUID.randomUUID());

        when(followRepository.findByFollowerKeycloakIdAndFollowingKeycloakId(me, target))
                .thenReturn(Optional.of(existing));

        AthleteProfile meProfile = AthleteProfile.builder()
                .keycloakId(me)
                .followingCount(0)
                .build();
        AthleteProfile targetProfile = AthleteProfile.builder()
                .keycloakId(target)
                .followersCount(0)
                .build();

        when(athleteProfileRepository.findByKeycloakId(me)).thenReturn(Optional.of(meProfile));
        when(athleteProfileRepository.findByKeycloakId(target)).thenReturn(Optional.of(targetProfile));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean isFollowing = service.toggleFollow(target);

        assertThat(isFollowing).isFalse();

        verify(followRepository).delete(existing);

        verify(athleteProfileRepository, times(2)).save(profileCaptor.capture());
        assertThat(profileCaptor.getAllValues()).hasSize(2);

        AthleteProfile saved1 = profileCaptor.getAllValues().get(0);
        AthleteProfile saved2 = profileCaptor.getAllValues().get(1);

        assertThat(saved1.getFollowingCount()).isEqualTo(0);
        assertThat(saved2.getFollowersCount()).isEqualTo(0);
    }

    @Test
    void toggleFollow_whenNotFollowing_shouldCreateAndIncrementCounters() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        when(followRepository.findByFollowerKeycloakIdAndFollowingKeycloakId(me, target))
                .thenReturn(Optional.empty());

        when(followRepository.save(any(Follow.class))).thenAnswer(inv -> inv.getArgument(0));

        AthleteProfile meProfile = AthleteProfile.builder()
                .keycloakId(me)
                .followingCount(2)
                .build();
        AthleteProfile targetProfile = AthleteProfile.builder()
                .keycloakId(target)
                .followersCount(5)
                .build();

        when(athleteProfileRepository.findByKeycloakId(me)).thenReturn(Optional.of(meProfile));
        when(athleteProfileRepository.findByKeycloakId(target)).thenReturn(Optional.of(targetProfile));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean isFollowing = service.toggleFollow(target);

        assertThat(isFollowing).isTrue();

        verify(followRepository).save(followCaptor.capture());
        Follow created = followCaptor.getValue();
        assertThat(created.getFollowerKeycloakId()).isEqualTo(me);
        assertThat(created.getFollowingKeycloakId()).isEqualTo(target);

        verify(athleteProfileRepository, times(2)).save(profileCaptor.capture());
        assertThat(profileCaptor.getAllValues().get(0).getFollowingCount()).isEqualTo(3);
        assertThat(profileCaptor.getAllValues().get(1).getFollowersCount()).isEqualTo(6);
    }

    @Test
    void toggleFollow_whenProfilesMissing_shouldStillToggleFollow_withoutSavingProfiles() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(followRepository.findByFollowerKeycloakIdAndFollowingKeycloakId(me, target))
                .thenReturn(Optional.empty());
        when(followRepository.save(any(Follow.class))).thenAnswer(inv -> inv.getArgument(0));

        when(athleteProfileRepository.findByKeycloakId(me)).thenReturn(Optional.empty());
        when(athleteProfileRepository.findByKeycloakId(target)).thenReturn(Optional.empty());

        boolean isFollowing = service.toggleFollow(target);

        assertThat(isFollowing).isTrue();

        verify(followRepository).save(any(Follow.class));
        verify(athleteProfileRepository, never()).save(any());
    }

    @Test
    void isFollowing_whenNotAuthenticated_shouldReturnFalse() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        boolean result = service.isFollowing(target);

        assertThat(result).isFalse();
        verifyNoInteractions(followRepository);
    }

    @Test
    void isFollowing_whenAuthenticated_shouldDelegateToRepo() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(followRepository.existsByFollowerKeycloakIdAndFollowingKeycloakId(me, target)).thenReturn(true);

        boolean result = service.isFollowing(target);

        assertThat(result).isTrue();
        verify(followRepository).existsByFollowerKeycloakIdAndFollowingKeycloakId(me, target);
    }

    @Test
    void getFollowers_shouldDelegateToRepo() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Follow> repoPage = new PageImpl<>(java.util.List.of());
        when(followRepository.findByFollowingKeycloakId(target, pageable)).thenReturn(repoPage);

        Page<Follow> result = service.getFollowers(target, pageable);

        assertThat(result).isSameAs(repoPage);
        verify(followRepository).findByFollowingKeycloakId(target, pageable);
    }

    @Test
    void getFollowing_shouldDelegateToRepo() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Follow> repoPage = new PageImpl<>(java.util.List.of());
        when(followRepository.findByFollowerKeycloakId(me, pageable)).thenReturn(repoPage);

        Page<Follow> result = service.getFollowing(me, pageable);

        assertThat(result).isSameAs(repoPage);
        verify(followRepository).findByFollowerKeycloakId(me, pageable);
    }
}

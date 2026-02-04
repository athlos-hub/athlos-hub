package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.OrganizationFollow;
import br.com.athloshub.social_service.repository.OrganizationFollowRepository;
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
class OrganizationFollowServiceTest {

    @Mock OrganizationFollowRepository organizationFollowRepository;
    @Mock JwtTokenProvider jwtTokenProvider;

    @InjectMocks OrganizationFollowService service;

    @Captor ArgumentCaptor<OrganizationFollow> followCaptor;

    String me;
    String orgSlug;

    @BeforeEach
    void setup() {
        me = "kc-me";
        orgSlug = "org-1";
    }

    @Test
    void toggleFollowOrganization_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.toggleFollowOrganization(orgSlug))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(organizationFollowRepository);
    }

    @Test
    void toggleFollowOrganization_whenAlreadyFollowing_shouldDeleteAndReturnFalse() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        OrganizationFollow existing = OrganizationFollow.builder()
                .followerKeycloakId(me)
                .organizationSlug(orgSlug)
                .build();
        existing.setId(UUID.randomUUID());

        when(organizationFollowRepository.findByFollowerKeycloakIdAndOrganizationSlug(me, orgSlug))
                .thenReturn(Optional.of(existing));

        boolean result = service.toggleFollowOrganization(orgSlug);

        assertThat(result).isFalse();
        verify(organizationFollowRepository).delete(existing);
        verify(organizationFollowRepository, never()).save(any());
    }

    @Test
    void toggleFollowOrganization_whenNotFollowing_shouldSaveAndReturnTrue() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        when(organizationFollowRepository.findByFollowerKeycloakIdAndOrganizationSlug(me, orgSlug))
                .thenReturn(Optional.empty());
        when(organizationFollowRepository.save(any(OrganizationFollow.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean result = service.toggleFollowOrganization(orgSlug);

        assertThat(result).isTrue();

        verify(organizationFollowRepository).save(followCaptor.capture());
        OrganizationFollow created = followCaptor.getValue();
        assertThat(created.getFollowerKeycloakId()).isEqualTo(me);
        assertThat(created.getOrganizationSlug()).isEqualTo(orgSlug);

        verify(organizationFollowRepository, never()).delete(any());
    }

    @Test
    void isFollowingOrganization_whenNotAuthenticated_shouldReturnFalse() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        boolean result = service.isFollowingOrganization(orgSlug);

        assertThat(result).isFalse();
        verifyNoInteractions(organizationFollowRepository);
    }

    @Test
    void isFollowingOrganization_whenAuthenticated_shouldDelegateToRepo() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(organizationFollowRepository.existsByFollowerKeycloakIdAndOrganizationSlug(me, orgSlug)).thenReturn(true);

        boolean result = service.isFollowingOrganization(orgSlug);

        assertThat(result).isTrue();
        verify(organizationFollowRepository).existsByFollowerKeycloakIdAndOrganizationSlug(me, orgSlug);
    }

    @Test
    void getOrganizationFollowersCount_shouldDelegateToRepo() {
        when(organizationFollowRepository.countByOrganizationSlug(orgSlug)).thenReturn(42L);

        long count = service.getOrganizationFollowersCount(orgSlug);

        assertThat(count).isEqualTo(42L);
        verify(organizationFollowRepository).countByOrganizationSlug(orgSlug);
    }

    @Test
    void getOrganizationFollowers_shouldDelegateToRepo() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<OrganizationFollow> repoPage = new PageImpl<>(java.util.List.of());
        when(organizationFollowRepository.findByOrganizationSlug(orgSlug, pageable)).thenReturn(repoPage);

        Page<OrganizationFollow> result = service.getOrganizationFollowers(orgSlug, pageable);

        assertThat(result).isSameAs(repoPage);
        verify(organizationFollowRepository).findByOrganizationSlug(orgSlug, pageable);
    }

    @Test
    void getMyFollowedOrganizations_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.getMyFollowedOrganizations(PageRequest.of(0, 10)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(organizationFollowRepository);
    }

    @Test
    void getMyFollowedOrganizations_whenAuthenticated_shouldDelegateToRepo() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);

        Pageable pageable = PageRequest.of(0, 10);
        Page<OrganizationFollow> repoPage = new PageImpl<>(java.util.List.of());
        when(organizationFollowRepository.findByFollowerKeycloakId(me, pageable)).thenReturn(repoPage);

        Page<OrganizationFollow> result = service.getMyFollowedOrganizations(pageable);

        assertThat(result).isSameAs(repoPage);
        verify(organizationFollowRepository).findByFollowerKeycloakId(me, pageable);
    }

    @Test
    void getFollowedOrganizationsByUser_shouldDelegateToRepo() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<OrganizationFollow> repoPage = new PageImpl<>(java.util.List.of());
        when(organizationFollowRepository.findByFollowerKeycloakId(me, pageable)).thenReturn(repoPage);

        Page<OrganizationFollow> result = service.getFollowedOrganizationsByUser(me, pageable);

        assertThat(result).isSameAs(repoPage);
        verify(organizationFollowRepository).findByFollowerKeycloakId(me, pageable);
    }
}

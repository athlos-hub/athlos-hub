package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.client.CompetitionsServiceClient;
import br.com.athloshub.social_service.dto.auth.OrganizationDTO;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import br.com.athloshub.social_service.dto.competitions.TeamDTO;
import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.*;

@ExtendWith(MockitoExtension.class)
class ProfileContextServiceTest {

    @Mock AuthServiceClient authServiceClient;
    @Mock CompetitionsServiceClient competitionsServiceClient;
    @Mock JwtTokenProvider jwtTokenProvider;

    @InjectMocks ProfileContextService service;

    String me;
    String orgSlug;

    @BeforeEach
    void setup() {
        me = UUID.randomUUID().toString();
        orgSlug = "org-1";
    }

    @Test
    void canCreatePostAsOrganization_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.canCreatePostAsOrganization(orgSlug))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(authServiceClient);
    }

    @Test
    void canCreatePostAsOrganization_whenTokenMissing_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(jwtTokenProvider.getBearerAuthorizationHeader()).thenReturn(null);

        assertThatThrownBy(() -> service.canCreatePostAsOrganization(orgSlug))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(authServiceClient);
    }

    @Test
    void canCreatePostAsOrganization_shouldCallAuthClient_andReturnIsAdmin() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(jwtTokenProvider.getBearerAuthorizationHeader()).thenReturn("Bearer tok");

        OrganizationDTO org = mock(OrganizationDTO.class);
        when(org.isAdmin()).thenReturn(true);

        when(authServiceClient.getOrganizationBySlug(eq(orgSlug), eq("Bearer tok"))).thenReturn(org);

        boolean result = service.canCreatePostAsOrganization(orgSlug);

        assertThat(result).isTrue();
        verify(authServiceClient).getOrganizationBySlug(orgSlug, "Bearer tok");
    }

    @Test
    void canCreatePostAsTeam_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.canCreatePostAsTeam(UUID.randomUUID().toString()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(competitionsServiceClient);
    }

    @Test
    void canCreatePostAsTeam_whenTokenMissing_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(jwtTokenProvider.getBearerAuthorizationHeader()).thenReturn(null);

        assertThatThrownBy(() -> service.canCreatePostAsTeam(UUID.randomUUID().toString()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(competitionsServiceClient);
    }

    @Test
    void canCreatePostAsTeam_whenInvalidTeamId_shouldThrow400() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(jwtTokenProvider.getBearerAuthorizationHeader()).thenReturn("Bearer tok");

        assertThatThrownBy(() -> service.canCreatePostAsTeam("not-a-uuid"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(BAD_REQUEST);

        verifyNoInteractions(competitionsServiceClient);
    }

    @Test
    void canCreatePostAsTeam_shouldCallCompetitionsClient_andReturnIsMember() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(jwtTokenProvider.getBearerAuthorizationHeader()).thenReturn("Bearer tok");

        UUID teamUUID = UUID.randomUUID();
        TeamDTO team = mock(TeamDTO.class);

        UUID userUUID = UUID.randomUUID();
        UserDTO currentUser = mock(UserDTO.class);
        when(currentUser.getId()).thenReturn(userUUID);
        when(authServiceClient.getUserByKeycloakId(eq(me), eq("Bearer tok"))).thenReturn(currentUser);

        when(team.isPlayerMember(userUUID)).thenReturn(true);

        when(authServiceClient.getTeamById(eq(teamUUID), eq("Bearer tok")))
                .thenThrow(new RuntimeException("not in auth"));
        when(competitionsServiceClient.getTeamById(eq(teamUUID), eq("Bearer tok"))).thenReturn(team);

        boolean result = service.canCreatePostAsTeam(teamUUID.toString());

        assertThat(result).isTrue();
        verify(competitionsServiceClient).getTeamById(teamUUID, "Bearer tok");
        verify(team).isPlayerMember(userUUID);
    }

    @Test
    void canCreatePostAsTeam_whenCompetitionsClientThrows_shouldThrow404() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(me);
        when(jwtTokenProvider.getBearerAuthorizationHeader()).thenReturn("Bearer tok");

        UUID teamUUID = UUID.randomUUID();
        UserDTO currentUser = mock(UserDTO.class);
        when(currentUser.getId()).thenReturn(UUID.randomUUID());
        when(authServiceClient.getUserByKeycloakId(eq(me), eq("Bearer tok"))).thenReturn(currentUser);
        when(authServiceClient.getTeamById(eq(teamUUID), eq("Bearer tok")))
                .thenThrow(new RuntimeException("not in auth"));
        when(competitionsServiceClient.getTeamById(eq(teamUUID), eq("Bearer tok")))
                .thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> service.canCreatePostAsTeam(teamUUID.toString()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);
    }

    @Test
    void getUserOrganizationSlugs_whenTokenMissing_shouldThrow401() {
        when(jwtTokenProvider.getBearerAuthorizationHeader()).thenReturn(null);

        assertThatThrownBy(() -> service.getUserOrganizationSlugs())
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(authServiceClient);
    }

    @Test
    void getUserOrganizationSlugs_shouldReturnOnlySlugs() {
        when(jwtTokenProvider.getBearerAuthorizationHeader()).thenReturn("Bearer tok");

        OrganizationDTO o1 = mock(OrganizationDTO.class);
        OrganizationDTO o2 = mock(OrganizationDTO.class);
        when(o1.getSlug()).thenReturn("org-1");
        when(o2.getSlug()).thenReturn("org-2");

        when(authServiceClient.getMyOrganizations("Bearer tok")).thenReturn(List.of(o1, o2));

        List<String> result = service.getUserOrganizationSlugs();

        assertThat(result).containsExactly("org-1", "org-2");
        verify(authServiceClient).getMyOrganizations("Bearer tok");
    }

    @Test
    void determineProfileType_whenNull_shouldReturnAthlete() {
        assertThat(service.determineProfileType(null)).isEqualTo(Post.ProfileType.ATHLETE);
    }

    @Test
    void determineProfileType_whenOrgPrefix_shouldReturnOrganization() {
        assertThat(service.determineProfileType("org-123")).isEqualTo(Post.ProfileType.ORGANIZATION);
    }

    @Test
    void determineProfileType_whenTeamPrefix_shouldReturnTeam() {
        assertThat(service.determineProfileType("team-123")).isEqualTo(Post.ProfileType.TEAM);
    }

    @Test
    void determineProfileType_whenOther_shouldReturnAthlete() {
        assertThat(service.determineProfileType("kc-123")).isEqualTo(Post.ProfileType.ATHLETE);
    }
}

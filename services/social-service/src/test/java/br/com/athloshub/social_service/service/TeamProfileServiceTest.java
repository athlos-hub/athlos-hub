package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.TeamProfile;
import br.com.athloshub.social_service.repository.TeamProfileRepository;
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
import static org.springframework.http.HttpStatus.NOT_FOUND;

@ExtendWith(MockitoExtension.class)
class TeamProfileServiceTest {

    @Mock TeamProfileRepository teamProfileRepository;

    @InjectMocks TeamProfileService service;

    @Captor ArgumentCaptor<TeamProfile> teamCaptor;

    String teamId;
    String orgSlug;

    @BeforeEach
    void setup() {
        teamId = "team-1";
        orgSlug = "org-1";
    }

    @Test
    void getProfileByTeamId_whenNotFound_shouldThrow404() {
        when(teamProfileRepository.findByTeamId(teamId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getProfileByTeamId(teamId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verify(teamProfileRepository).findByTeamId(teamId);
    }

    @Test
    void getProfileByTeamId_whenFound_shouldReturnProfile() {
        TeamProfile profile = TeamProfile.builder()
                .teamId(teamId)
                .organizationSlug(orgSlug)
                .description("desc")
                .build();

        when(teamProfileRepository.findByTeamId(teamId)).thenReturn(Optional.of(profile));

        TeamProfile result = service.getProfileByTeamId(teamId);

        assertThat(result).isSameAs(profile);
        verify(teamProfileRepository).findByTeamId(teamId);
    }

    @Test
    void getTeamsByOrganization_shouldDelegateToRepo() {
        List<TeamProfile> list = List.of(
                TeamProfile.builder().teamId("t1").organizationSlug(orgSlug).build(),
                TeamProfile.builder().teamId("t2").organizationSlug(orgSlug).build()
        );

        when(teamProfileRepository.findByOrganizationSlug(orgSlug)).thenReturn(list);

        List<TeamProfile> result = service.getTeamsByOrganization(orgSlug);

        assertThat(result).isSameAs(list);
        verify(teamProfileRepository).findByOrganizationSlug(orgSlug);
    }

    @Test
    void getOrCreateProfile_whenFound_shouldReturnExisting_withoutSaving() {
        TeamProfile existing = TeamProfile.builder()
                .teamId(teamId)
                .organizationSlug(orgSlug)
                .description("old")
                .build();

        when(teamProfileRepository.findByTeamId(teamId)).thenReturn(Optional.of(existing));

        TeamProfile result = service.getOrCreateProfile(teamId, orgSlug);

        assertThat(result).isSameAs(existing);
        verify(teamProfileRepository, never()).save(any());
    }

    @Test
    void getOrCreateProfile_whenNotFound_shouldCreateAndSave() {
        when(teamProfileRepository.findByTeamId(teamId)).thenReturn(Optional.empty());
        when(teamProfileRepository.save(any(TeamProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        TeamProfile created = service.getOrCreateProfile(teamId, orgSlug);

        assertThat(created.getTeamId()).isEqualTo(teamId);
        assertThat(created.getOrganizationSlug()).isEqualTo(orgSlug);

        verify(teamProfileRepository).save(teamCaptor.capture());
        assertThat(teamCaptor.getValue().getTeamId()).isEqualTo(teamId);
        assertThat(teamCaptor.getValue().getOrganizationSlug()).isEqualTo(orgSlug);
    }

    @Test
    void updateProfile_whenNotFound_shouldThrow404() {
        when(teamProfileRepository.findByTeamId(teamId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateProfile(teamId, Map.of("description", "x")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verify(teamProfileRepository).findByTeamId(teamId);
        verify(teamProfileRepository, never()).save(any());
    }

    @Test
    void updateProfile_shouldUpdateOnlyProvidedFields_andSave() {
        TeamProfile existing = TeamProfile.builder()
                .teamId(teamId)
                .organizationSlug(orgSlug)
                .description("old")
                .socialLinks(Map.of("x", "y"))
                .isPrivate(false)
                .build();

        when(teamProfileRepository.findByTeamId(teamId)).thenReturn(Optional.of(existing));
        when(teamProfileRepository.save(any(TeamProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> updates = new HashMap<>();
        updates.put("description", "new desc");
        updates.put("socialLinks", Map.of("instagram", "@team"));
        updates.put("isPrivate", true);

        TeamProfile updated = service.updateProfile(teamId, updates);

        assertThat(updated.getDescription()).isEqualTo("new desc");
        assertThat(updated.getSocialLinks()).containsEntry("instagram", "@team");
        assertThat(updated.getIsPrivate()).isTrue();

        verify(teamProfileRepository).save(existing);
    }

    @Test
    void updateProfile_whenUpdatesEmpty_shouldStillSaveSameProfile() {
        TeamProfile existing = TeamProfile.builder()
                .teamId(teamId)
                .organizationSlug(orgSlug)
                .description("old")
                .isPrivate(false)
                .build();

        when(teamProfileRepository.findByTeamId(teamId)).thenReturn(Optional.of(existing));
        when(teamProfileRepository.save(any(TeamProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        TeamProfile updated = service.updateProfile(teamId, Collections.emptyMap());

        assertThat(updated).isSameAs(existing);
        assertThat(updated.getDescription()).isEqualTo("old");
        assertThat(updated.getIsPrivate()).isFalse();

        verify(teamProfileRepository).save(existing);
    }
}

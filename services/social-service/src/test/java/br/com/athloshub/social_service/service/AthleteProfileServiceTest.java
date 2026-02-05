package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.client.AuthServiceClient;
import br.com.athloshub.social_service.dto.auth.UserDTO;
import br.com.athloshub.social_service.entity.AthleteProfile;
import br.com.athloshub.social_service.repository.AthleteProfileRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.*;

@ExtendWith(MockitoExtension.class)
class AthleteProfileServiceTest {

    @Mock AthleteProfileRepository athleteProfileRepository;
    @Mock AuthServiceClient authServiceClient;
    @Mock JwtTokenProvider jwtTokenProvider;

    @InjectMocks AthleteProfileService service;

    String keycloakId;

    @BeforeEach
    void setup() {
        keycloakId = "kc-123";
    }

    @Test
    void getProfileByKeycloakId_whenExists_shouldReturnExisting() {
        AthleteProfile existing = AthleteProfile.builder().keycloakId(keycloakId).bio("bio").build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));

        AthleteProfile result = service.getProfileByKeycloakId(keycloakId);

        assertThat(result).isSameAs(existing);
        verify(athleteProfileRepository, never()).save(any());
    }

    @Test
    void getProfileByKeycloakId_whenMissing_shouldCreateAndSave() {
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.empty());
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        AthleteProfile result = service.getProfileByKeycloakId(keycloakId);

        assertThat(result.getKeycloakId()).isEqualTo(keycloakId);
        verify(athleteProfileRepository).save(any(AthleteProfile.class));
    }

    @Test
    void getMyProfile_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(service::getMyProfile)
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(athleteProfileRepository);
    }

    @Test
    void getMyProfile_whenAuthenticated_shouldReturnProfile() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(keycloakId);
        AthleteProfile existing = AthleteProfile.builder().keycloakId(keycloakId).build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));

        AthleteProfile result = service.getMyProfile();

        assertThat(result).isSameAs(existing);
    }

    @Test
    void createOrUpdateProfile_whenNotAuthenticated_shouldThrow401() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(null);

        assertThatThrownBy(() -> service.createOrUpdateProfile(
                "bio", "spec", "city", "state", "country",
                Map.of("a", 1), Map.of("s", 2), Map.of("l", 3), true
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(UNAUTHORIZED);

        verifyNoInteractions(athleteProfileRepository);
    }

    @Test
    void createOrUpdateProfile_whenProfileMissing_shouldCreateAndSaveWithProvidedFields() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(keycloakId);
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.empty());
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> achievements = Map.of("medals", 2);
        Map<String, Object> statistics = Map.of("wins", 10);
        Map<String, Object> socialLinks = Map.of("instagram", "@athlete");

        AthleteProfile saved = service.createOrUpdateProfile(
                "my bio", "runner", "Natal", "RN", "BR",
                achievements, statistics, socialLinks, false
        );

        assertThat(saved.getKeycloakId()).isEqualTo(keycloakId);
        assertThat(saved.getBio()).isEqualTo("my bio");
        assertThat(saved.getSpecialization()).isEqualTo("runner");
        assertThat(saved.getCity()).isEqualTo("Natal");
        assertThat(saved.getState()).isEqualTo("RN");
        assertThat(saved.getCountry()).isEqualTo("BR");
        assertThat(saved.getAchievements()).isEqualTo(achievements);
        assertThat(saved.getStatistics()).isEqualTo(statistics);
        assertThat(saved.getSocialLinks()).isEqualTo(socialLinks);
        assertThat(saved.getIsPublic()).isFalse();

        verify(athleteProfileRepository).save(any(AthleteProfile.class));
    }

    @Test
    void createOrUpdateProfile_whenProfileExists_shouldUpdateOnlyNonNullFields() {
        when(jwtTokenProvider.getCurrentKeycloakId()).thenReturn(keycloakId);

        AthleteProfile existing = AthleteProfile.builder()
                .keycloakId(keycloakId)
                .bio("old bio")
                .city("Old City")
                .isPublic(true)
                .build();

        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        AthleteProfile saved = service.createOrUpdateProfile(
                null,
                "new spec",
                null,
                "New State",
                null,
                null,
                null,
                null,
                null
        );

        assertThat(saved.getBio()).isEqualTo("old bio");
        assertThat(saved.getCity()).isEqualTo("Old City");
        assertThat(saved.getSpecialization()).isEqualTo("new spec");
        assertThat(saved.getState()).isEqualTo("New State");
        assertThat(saved.getIsPublic()).isTrue();

        verify(athleteProfileRepository).save(existing);
    }

    @Test
    void getOrCreateProfile_whenExists_shouldReturnExisting() {
        AthleteProfile existing = AthleteProfile.builder().keycloakId(keycloakId).build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));

        AthleteProfile result = service.getOrCreateProfile(keycloakId);

        assertThat(result).isSameAs(existing);
        verify(athleteProfileRepository, never()).save(any());
    }

    @Test
    void getOrCreateProfile_whenMissing_shouldCreateAndSave() {
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.empty());
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        AthleteProfile result = service.getOrCreateProfile(keycloakId);

        assertThat(result.getKeycloakId()).isEqualTo(keycloakId);
        verify(athleteProfileRepository).save(any(AthleteProfile.class));
    }

    @Test
    void getUserWithProfile_whenUserFound_shouldReturnUser() {
        UserDTO user = mock(UserDTO.class);
        when(user.getId()).thenReturn(UUID.fromString("00000000-0000-0000-0000-000000000123"));

        when(authServiceClient.getAllUsers("Bearer token")).thenReturn(List.of(user));

        UserDTO result = service.getUserWithProfile("00000000-0000-0000-0000-000000000123", "Bearer token");

        assertThat(result).isSameAs(user);
    }

    @Test
    void getUserWithProfile_whenUserNotFound_shouldThrow404() {
        UserDTO user = mock(UserDTO.class);
        when(user.getId()).thenReturn(UUID.fromString("00000000-0000-0000-0000-000000000999"));
        when(authServiceClient.getAllUsers("Bearer token")).thenReturn(List.of(user));

        assertThatThrownBy(() -> service.getUserWithProfile("00000000-0000-0000-0000-000000000123", "Bearer token"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);
    }

    @Test
    void updateProfile_shouldApplyKnownKeys_andSave() {
        AthleteProfile existing = AthleteProfile.builder()
                .keycloakId(keycloakId)
                .bio("old")
                .specialization("old spec")
                .city("old city")
                .state("old state")
                .country("old country")
                .isPublic(true)
                .build();

        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> updates = Map.of(
                "bio", "new bio",
                "specialization", "new spec",
                "city", "new city",
                "state", "new state",
                "country", "new country",
                "isPublic", false
        );

        AthleteProfile saved = service.updateProfile(keycloakId, updates);

        assertThat(saved.getBio()).isEqualTo("new bio");
        assertThat(saved.getSpecialization()).isEqualTo("new spec");
        assertThat(saved.getCity()).isEqualTo("new city");
        assertThat(saved.getState()).isEqualTo("new state");
        assertThat(saved.getCountry()).isEqualTo("new country");
        assertThat(saved.getIsPublic()).isFalse();

        verify(athleteProfileRepository).save(existing);
    }

    @Test
    void updateBio_shouldSetBio_andSave() {
        AthleteProfile existing = AthleteProfile.builder().keycloakId(keycloakId).bio("old").build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        AthleteProfile saved = service.updateBio(keycloakId, "new");

        assertThat(saved.getBio()).isEqualTo("new");
        verify(athleteProfileRepository).save(existing);
    }

    @Test
    void updateAchievements_shouldSetAchievements_andSave() {
        AthleteProfile existing = AthleteProfile.builder().keycloakId(keycloakId).build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> ach = Map.of("trophies", 1);

        AthleteProfile saved = service.updateAchievements(keycloakId, ach);

        assertThat(saved.getAchievements()).isEqualTo(ach);
        verify(athleteProfileRepository).save(existing);
    }

    @Test
    void updateStatistics_shouldSetStatistics_andSave() {
        AthleteProfile existing = AthleteProfile.builder().keycloakId(keycloakId).build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> stats = Map.of("pace", 5);

        AthleteProfile saved = service.updateStatistics(keycloakId, stats);

        assertThat(saved.getStatistics()).isEqualTo(stats);
        verify(athleteProfileRepository).save(existing);
    }

    @Test
    void updateSocialLinks_shouldSetSocialLinks_andSave() {
        AthleteProfile existing = AthleteProfile.builder().keycloakId(keycloakId).build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> links = Map.of("twitter", "@t");

        AthleteProfile saved = service.updateSocialLinks(keycloakId, links);

        assertThat(saved.getSocialLinks()).isEqualTo(links);
        verify(athleteProfileRepository).save(existing);
    }

    @Test
    void toggleProfileVisibility_shouldSetIsPublic_andSave() {
        AthleteProfile existing = AthleteProfile.builder().keycloakId(keycloakId).isPublic(true).build();
        when(athleteProfileRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(existing));
        when(athleteProfileRepository.save(any(AthleteProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        AthleteProfile saved = service.toggleProfileVisibility(keycloakId, false);

        assertThat(saved.getIsPublic()).isFalse();
        verify(athleteProfileRepository).save(existing);
    }
}

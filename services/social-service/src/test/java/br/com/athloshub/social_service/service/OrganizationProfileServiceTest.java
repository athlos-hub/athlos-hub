package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.OrganizationProfile;
import br.com.athloshub.social_service.repository.OrganizationProfileRepository;
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
class OrganizationProfileServiceTest {

    @Mock OrganizationProfileRepository organizationProfileRepository;

    @InjectMocks OrganizationProfileService service;

    @Captor ArgumentCaptor<OrganizationProfile> profileCaptor;

    String slug;

    @BeforeEach
    void setup() {
        slug = "org-1";
    }

    @Test
    void getProfileBySlug_whenNotFound_shouldThrow404() {
        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getProfileBySlug(slug))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(NOT_FOUND);

        verify(organizationProfileRepository).findByOrganizationSlug(slug);
    }

    @Test
    void getProfileBySlug_whenFound_shouldReturnProfile() {
        OrganizationProfile profile = OrganizationProfile.builder()
                .organizationSlug(slug)
                .description("desc")
                .build();

        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.of(profile));

        OrganizationProfile result = service.getProfileBySlug(slug);

        assertThat(result).isSameAs(profile);
        verify(organizationProfileRepository).findByOrganizationSlug(slug);
    }

    @Test
    void getOrCreateProfile_whenFound_shouldReturnExisting_withoutSaving() {
        OrganizationProfile existing = OrganizationProfile.builder()
                .organizationSlug(slug)
                .description("old")
                .build();

        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.of(existing));

        OrganizationProfile result = service.getOrCreateProfile(slug);

        assertThat(result).isSameAs(existing);
        verify(organizationProfileRepository, never()).save(any());
    }

    @Test
    void getOrCreateProfile_whenNotFound_shouldCreateAndSave() {
        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.empty());
        when(organizationProfileRepository.save(any(OrganizationProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        OrganizationProfile result = service.getOrCreateProfile(slug);

        assertThat(result.getOrganizationSlug()).isEqualTo(slug);

        verify(organizationProfileRepository).save(profileCaptor.capture());
        assertThat(profileCaptor.getValue().getOrganizationSlug()).isEqualTo(slug);
    }

    @Test
    void updateProfile_shouldUpdateOnlyProvidedFields_andSave() {
        OrganizationProfile existing = OrganizationProfile.builder()
                .organizationSlug(slug)
                .description("old")
                .isPrivate(false)
                .socialLinks(Map.of("x", "y"))
                .build();

        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.of(existing));
        when(organizationProfileRepository.save(any(OrganizationProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> updates = new HashMap<>();
        updates.put("description", "new desc");
        updates.put("socialLinks", Map.of("instagram", "@org"));
        updates.put("isPrivate", true);

        OrganizationProfile updated = service.updateProfile(slug, updates);

        assertThat(updated.getDescription()).isEqualTo("new desc");
        assertThat(updated.getSocialLinks()).containsEntry("instagram", "@org");
        assertThat(updated.getIsPrivate()).isTrue();

        verify(organizationProfileRepository).save(existing);
    }

    @Test
    void updateProfile_whenUpdatesEmpty_shouldStillSaveSameProfile() {
        OrganizationProfile existing = OrganizationProfile.builder()
                .organizationSlug(slug)
                .description("old")
                .isPrivate(false)
                .build();

        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.of(existing));
        when(organizationProfileRepository.save(any(OrganizationProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        OrganizationProfile updated = service.updateProfile(slug, Collections.emptyMap());

        assertThat(updated).isSameAs(existing);
        assertThat(updated.getDescription()).isEqualTo("old");
        assertThat(updated.getIsPrivate()).isFalse();

        verify(organizationProfileRepository).save(existing);
    }

    @Test
    void updateProfile_whenProfileNotFound_shouldCreateThenUpdateAndSave() {
        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.empty());
        when(organizationProfileRepository.save(any(OrganizationProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> updates = new HashMap<>();
        updates.put("description", "desc");

        OrganizationProfile updated = service.updateProfile(slug, updates);

        assertThat(updated.getOrganizationSlug()).isEqualTo(slug);
        assertThat(updated.getDescription()).isEqualTo("desc");

        verify(organizationProfileRepository, times(2)).save(any(OrganizationProfile.class));
    }

    @Test
    void incrementFollowersCount_shouldIncreaseCount_andSave() {
        OrganizationProfile existing = OrganizationProfile.builder()
                .organizationSlug(slug)
                .followersCount(2)
                .build();

        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.of(existing));
        when(organizationProfileRepository.save(any(OrganizationProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        service.incrementFollowersCount(slug);

        assertThat(existing.getFollowersCount()).isEqualTo(3);
        verify(organizationProfileRepository).save(existing);
    }

    @Test
    void decrementFollowersCount_shouldNotGoBelowZero_andSave() {
        OrganizationProfile existing = OrganizationProfile.builder()
                .organizationSlug(slug)
                .followersCount(0)
                .build();

        when(organizationProfileRepository.findByOrganizationSlug(slug)).thenReturn(Optional.of(existing));
        when(organizationProfileRepository.save(any(OrganizationProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        service.decrementFollowersCount(slug);

        assertThat(existing.getFollowersCount()).isEqualTo(0);
        verify(organizationProfileRepository).save(existing);
    }
}

package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.moderation.ModerationService;
import br.com.athloshub.social_service.repository.AthleteProfileRepository;
import br.com.athloshub.social_service.repository.OrganizationProfileRepository;
import br.com.athloshub.social_service.repository.PostRepository;
import br.com.athloshub.social_service.repository.TeamProfileRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final AthleteProfileRepository athleteProfileRepository;
    private final OrganizationProfileRepository organizationProfileRepository;
    private final TeamProfileRepository teamProfileRepository;
    private final JwtTokenProvider jwtTokenProvider;

    private final ModerationService moderationService;

    @Transactional
    public Post createPost(
            Post.ProfileType profileType,
            String profileId,
            String content,
            List<String> mediaUrls,
            Post.PostType type,
            Post.PostVisibility visibility,
            Map<String, Object> metadata
    ) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        if (profileType == Post.ProfileType.ATHLETE) {
            throw new ResponseStatusException(FORBIDDEN, "Atletas não podem criar posts manualmente");
        }

        moderationService.assertAllowed(content);

        Post post = Post.builder()
                .profileType(profileType)
                .profileId(profileId)
                .createdByKeycloakId(keycloakId)
                .content(content)
                .mediaUrls(mediaUrls)
                .type(type != null ? type : Post.PostType.TEXT)
                .visibility(visibility != null ? visibility : Post.PostVisibility.PUBLIC)
                .metadata(metadata)
                .build();

        Post savedPost = postRepository.save(post);

        updateProfilePostsCount(profileType, profileId, 1);

        return savedPost;
    }

    @Transactional
    public Post createAchievementPost(
            String keycloakId,
            String content,
            Map<String, Object> achievementData
    ) {

        moderationService.assertAllowed(content);

        Post post = Post.builder()
                .profileType(Post.ProfileType.ATHLETE)
                .profileId(keycloakId)
                .createdByKeycloakId("SYSTEM")
                .content(content)
                .type(Post.PostType.ACHIEVEMENT)
                .visibility(Post.PostVisibility.PUBLIC)
                .metadata(achievementData)
                .build();

        Post savedPost = postRepository.save(post);

        athleteProfileRepository.findByKeycloakId(keycloakId).ifPresent(profile -> {
            profile.setAchievementsCount(profile.getAchievementsCount() + 1);
            athleteProfileRepository.save(profile);
        });

        return savedPost;
    }

    @Transactional(readOnly = true)
    public Post getPostById(UUID postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Post não encontrado"));
    }

    @Transactional(readOnly = true)
    public Page<Post> getProfilePosts(Post.ProfileType profileType, String profileId, Pageable pageable) {
        return postRepository.findByProfileTypeAndProfileIdOrderByCreatedAtDesc(profileType, profileId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Post> getPublicFeed(Pageable pageable) {
        return postRepository.findPublicPostsOrderByCreatedAtDesc(pageable);
    }

    @Transactional
    public Post updatePost(UUID postId, String content, List<String> mediaUrls) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        Post post = getPostById(postId);

        if (!post.getCreatedByKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para editar este post");
        }

        if (content != null) {
            moderationService.assertAllowed(content);
            post.setContent(content);
        }
        if (mediaUrls != null) post.setMediaUrls(mediaUrls);

        return postRepository.save(post);
    }

    @Transactional
    public void deletePost(UUID postId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        Post post = getPostById(postId);

        if (!post.getCreatedByKeycloakId().equals(keycloakId) && !"SYSTEM".equals(post.getCreatedByKeycloakId())) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para deletar este post");
        }

        updateProfilePostsCount(post.getProfileType(), post.getProfileId(), -1);

        postRepository.delete(post);
    }

    private void updateProfilePostsCount(Post.ProfileType profileType, String profileId, int delta) {
        switch (profileType) {
            case ATHLETE:
                athleteProfileRepository.findByKeycloakId(profileId).ifPresent(profile -> {
                    profile.setAchievementsCount(Math.max(0, profile.getAchievementsCount() + delta));
                    athleteProfileRepository.save(profile);
                });
                break;
            case ORGANIZATION:
                organizationProfileRepository.findByOrganizationSlug(profileId).ifPresent(profile -> {
                    profile.setPostsCount(Math.max(0, profile.getPostsCount() + delta));
                    organizationProfileRepository.save(profile);
                });
                break;
            case TEAM:
                teamProfileRepository.findByTeamId(profileId).ifPresent(profile -> {
                    profile.setPostsCount(Math.max(0, profile.getPostsCount() + delta));
                    teamProfileRepository.save(profile);
                });
                break;
        }
    }

    @Transactional
    public Post createOrganizationPost(
            String organizationSlug,
            String content,
            List<String> mediaUrls,
            Post.PostType type,
            Post.PostVisibility visibility,
            Map<String, Object> metadata
    ) {
        return createPost(
                Post.ProfileType.ORGANIZATION,
                organizationSlug,
                content,
                mediaUrls,
                type,
                visibility,
                metadata
        );
    }

    @Transactional
    public Post createTeamPost(
            String teamId,
            String content,
            List<String> mediaUrls,
            Post.PostType type,
            Post.PostVisibility visibility,
            Map<String, Object> metadata
    ) {
        return createPost(
                Post.ProfileType.TEAM,
                teamId,
                content,
                mediaUrls,
                type,
                visibility,
                metadata
        );
    }

    @Transactional
    public Post createAthletePost(String keycloakId, br.com.athloshub.social_service.dto.request.CreatePostRequest request) {
        athleteProfileRepository.findByKeycloakId(keycloakId)
                .orElseGet(() -> {
                    var profile = br.com.athloshub.social_service.entity.AthleteProfile.builder()
                            .keycloakId(keycloakId)
                            .build();
                    return athleteProfileRepository.save(profile);
                });

        moderationService.assertAllowed(request.getContent());

        Post post = Post.builder()
                .profileType(Post.ProfileType.ATHLETE)
                .profileId(keycloakId)
                .createdByKeycloakId(keycloakId)
                .content(request.getContent())
                .mediaUrls(request.getMediaUrls())
                .type(request.getType() != null ? request.getType() : Post.PostType.TEXT)
                .visibility(request.getVisibility() != null ? request.getVisibility() : Post.PostVisibility.PUBLIC)
                .metadata(request.getMetadata())
                .build();

        Post savedPost = postRepository.save(post);

        athleteProfileRepository.findByKeycloakId(keycloakId).ifPresent(profile -> {
            profile.setPostsCount(profile.getPostsCount() + 1);
            athleteProfileRepository.save(profile);
        });

        return savedPost;
    }

    @Transactional(readOnly = true)
    public Page<Post> getAthletePostsByKeycloakId(String keycloakId, Pageable pageable) {
        return postRepository.findByProfileTypeAndProfileIdOrderByCreatedAtDesc(
                Post.ProfileType.ATHLETE,
                keycloakId,
                pageable
        );
    }

    @Transactional
    public void deleteAthletePost(UUID postId, String keycloakId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Post não encontrado"));

        if (!post.getCreatedByKeycloakId().equals(keycloakId)) {
            throw new ResponseStatusException(FORBIDDEN, "Você não tem permissão para deletar este post");
        }

        if (post.getProfileType() != Post.ProfileType.ATHLETE) {
            throw new ResponseStatusException(FORBIDDEN, "Este não é um post de atleta");
        }

        postRepository.delete(post);
        
        // Atualizar contador
        athleteProfileRepository.findByKeycloakId(keycloakId).ifPresent(profile -> {
            profile.setPostsCount(Math.max(0, profile.getPostsCount() - 1));
            athleteProfileRepository.save(profile);
        });
    }

    @Transactional
    public Post sharePost(UUID originalPostId, String keycloakId, br.com.athloshub.social_service.dto.request.CreatePostRequest shareRequest) {
        Post originalPost = postRepository.findById(originalPostId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Post original não encontrado"));

        // Verificar se o perfil existe
        athleteProfileRepository.findByKeycloakId(keycloakId)
                .orElseGet(() -> {
                    var profile = br.com.athloshub.social_service.entity.AthleteProfile.builder()
                            .keycloakId(keycloakId)
                            .build();
                    return athleteProfileRepository.save(profile);
                });

        // Criar metadata com referência ao post original
        Map<String, Object> shareMetadata = shareRequest != null && shareRequest.getMetadata() != null
                ? new java.util.HashMap<>(shareRequest.getMetadata())
                : new java.util.HashMap<>();

        shareMetadata.put("sharedPostId", originalPostId.toString());
        shareMetadata.put("originalAuthor", originalPost.getProfileId());
        shareMetadata.put("originalProfileType", originalPost.getProfileType().toString());

        String shareContent = shareRequest != null && shareRequest.getContent() != null
                ? shareRequest.getContent()
                : "";

        moderationService.assertAllowed(shareContent);

        Post sharedPost = Post.builder()
                .profileType(Post.ProfileType.ATHLETE)
                .profileId(keycloakId)
                .createdByKeycloakId(keycloakId)
                .content(shareContent)
                .type(Post.PostType.SHARED)
                .visibility(Post.PostVisibility.PUBLIC)
                .metadata(shareMetadata)
                .build();

        Post savedPost = postRepository.save(sharedPost);
        
        // Atualizar contador de compartilhamentos do post original
        originalPost.setSharesCount(originalPost.getSharesCount() + 1);
        postRepository.save(originalPost);
        
        // Atualizar contador de posts do atleta
        athleteProfileRepository.findByKeycloakId(keycloakId).ifPresent(profile -> {
            profile.setPostsCount(profile.getPostsCount() + 1);
            athleteProfileRepository.save(profile);
        });
        
        return savedPost;
    }
}

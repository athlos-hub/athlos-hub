package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.TeamFollow;
import br.com.athloshub.social_service.repository.TeamFollowRepository;
import br.com.athloshub.social_service.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeamFollowService {

    private final TeamFollowRepository teamFollowRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public boolean toggleFollowTeam(String teamId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Usuário não autenticado");
        }

        return teamFollowRepository.findByFollowerKeycloakIdAndTeamId(keycloakId, teamId)
            .map(existing -> {
                teamFollowRepository.delete(existing);
                log.info("Usuário {} deixou de seguir equipe {}", keycloakId, teamId);
                return false;
            })
            .orElseGet(() -> {
                TeamFollow newFollow = TeamFollow.builder()
                    .followerKeycloakId(keycloakId)
                    .teamId(teamId)
                    .build();
                teamFollowRepository.save(newFollow);
                log.info("Usuário {} começou a seguir equipe {}", keycloakId, teamId);
                return true;
            });
    }

    @Transactional(readOnly = true)
    public boolean isFollowingTeam(String teamId) {
        String keycloakId = jwtTokenProvider.getCurrentKeycloakId();
        if (keycloakId == null) {
            return false;
        }
        return teamFollowRepository.existsByFollowerKeycloakIdAndTeamId(keycloakId, teamId);
    }

    @Transactional(readOnly = true)
    public long getTeamFollowersCount(String teamId) {
        return teamFollowRepository.countByTeamId(teamId);
    }

    @Transactional(readOnly = true)
    public Page<TeamFollow> getTeamFollowers(String teamId, Pageable pageable) {
        return teamFollowRepository.findByTeamId(teamId, pageable);
    }
}

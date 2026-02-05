package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.TeamFollow;
import br.com.athloshub.social_service.service.TeamFollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/social/team-follow")
@RequiredArgsConstructor
public class TeamFollowController {

    private final TeamFollowService teamFollowService;

    @PostMapping("/{teamId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> toggleFollowTeam(@PathVariable String teamId) {
        boolean isFollowing = teamFollowService.toggleFollowTeam(teamId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("following", isFollowing)));
    }

    @GetMapping("/check/{teamId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkFollowingTeam(@PathVariable String teamId) {
        boolean isFollowing = teamFollowService.isFollowingTeam(teamId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("following", isFollowing)));
    }

    @GetMapping("/count/{teamId}")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getTeamFollowersCount(@PathVariable String teamId) {
        long count = teamFollowService.getTeamFollowersCount(teamId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", count)));
    }

    @GetMapping("/followers/{teamId}")
    public ResponseEntity<ApiResponse<Page<TeamFollow>>> getTeamFollowers(
            @PathVariable String teamId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<TeamFollow> followers = teamFollowService.getTeamFollowers(teamId, pageable);
        return ResponseEntity.ok(ApiResponse.success(followers));
    }
}

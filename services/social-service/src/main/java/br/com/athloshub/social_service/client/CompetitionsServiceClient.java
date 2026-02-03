package br.com.athloshub.social_service.client;

import br.com.athloshub.social_service.dto.competitions.TeamDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;
import java.util.UUID;

@FeignClient(
    name = "competitions-service",
    url = "${services.competitions-service.url}",
    configuration = CompetitionsServiceClientConfiguration.class
)
public interface CompetitionsServiceClient {
    
    @GetMapping("/api/v1/teams/{teamId}")
    TeamDTO getTeamById(
        @PathVariable("teamId") UUID teamId,
        @RequestHeader("Authorization") String authorization
    );
    
    @GetMapping("/api/v1/teams")
    List<TeamDTO> getAllTeams(
        @RequestHeader("Authorization") String authorization
    );
}

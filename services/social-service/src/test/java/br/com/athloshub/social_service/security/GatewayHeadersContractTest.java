package br.com.athloshub.social_service.security;

import br.com.athloshub.social_service.config.SecurityConfig;
import br.com.athloshub.social_service.controller.AuthTestController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthTestController.class)
@Import({SecurityConfig.class, GatewayIdentityFilter.class, JwtTokenProvider.class})
@TestPropertySource(
        properties = {
                "TRUST_GATEWAY=true",
                "spring.profiles.active=dev",
                "cors.allowed-origins=*",
        })
class GatewayHeadersContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void meWithoutGatewayHeaders_returns401() throws Exception {
        mockMvc.perform(get("/api/social/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void meWithXKeycloakSub_returns200() throws Exception {
        mockMvc.perform(
                        get("/api/social/auth/me")
                                .header("X-Keycloak-Sub", "kc-contract-1")
                                .header("X-Keycloak-Email", "a@b.com")
                                .header("X-Keycloak-Preferred-Username", "user1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keycloakId").value("kc-contract-1"))
                .andExpect(jsonPath("$.authenticated").value(true));
    }
}

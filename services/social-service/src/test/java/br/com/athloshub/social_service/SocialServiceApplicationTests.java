package br.com.athloshub.social_service;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Disabled("Integration test - requires database")
class SocialServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}

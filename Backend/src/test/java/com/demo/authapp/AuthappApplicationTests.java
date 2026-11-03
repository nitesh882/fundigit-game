package com.demo.authapp;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {"debug=false", "logging.level.org.springframework=WARN", "logging.level.org.hibernate.SQL=WARN"})
@ActiveProfiles("test")
class AuthappApplicationTests {

	@Test
	void contextLoads() {
	}

}

package com.demo.authapp.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;
import java.time.ZoneOffset;
@Configuration
public class TimeConfig {
    // Millisecond precision survives database round trips without changing a deadline.
    @Bean public Clock clock() { return Clock.tickMillis(ZoneOffset.UTC); }
}

package com.demo.authapp;

import com.demo.authapp.dto.AuthDtos.SignupRequest;
import com.demo.authapp.dto.game.SessionDtos.*;
import com.demo.authapp.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import java.nio.file.Path;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class PersistenceTests {
    @TempDir Path directory;

    @Test void accountsScoresAndActiveQuestionsSurviveApplicationRestart() {
        String database = "jdbc:h2:file:" + directory.resolve("game").toAbsolutePath().toString().replace('\\', '/') + ";WRITE_DELAY=0";
        String email = "persistent@example.com";
        String activeId;
        QuestionView activeQuestion;
        try (ConfigurableApplicationContext first = boot(database)) {
            UserService users = first.getBean(UserService.class);
            users.register(new SignupRequest("Persistent Player", email, "Password123!"));
            SessionService games = first.getBean(SessionService.class);
            SessionView round = games.start(email, new StartRequest("add", "medium", UUID.randomUUID().toString()));
            for (int n = 0; n < 10; n++) {
                QuestionView q = round.question();
                round = games.answer(email, round.id(), new AnswerRequest(q.id(), String.valueOf(q.a() + q.b()),
                        carryMarks(q), "answer")).session();
            }
            assertEquals("COMPLETED", round.status());
            assertEquals(100, round.score());
            SessionView active = games.start(email, new StartRequest("mul", "easy", UUID.randomUUID().toString()));
            activeId = active.id();
            activeQuestion = active.question();
        }
        try (ConfigurableApplicationContext second = boot(database)) {
            UserService users = second.getBean(UserService.class);
            assertEquals("Persistent Player", users.login(email, "Password123!").getUsername());
            var history = second.getBean(ScoreService.class).getUserHistory(email, 50);
            assertEquals(1, history.size());
            assertEquals("COMPLETED", history.get(0).status());
            assertEquals(100, history.get(0).score());
            SessionView active = second.getBean(SessionService.class).get(email, activeId);
            assertEquals("ACTIVE", active.status());
            assertEquals(activeQuestion.id(), active.question().id());
            assertEquals(activeQuestion.expiresAt(), active.question().expiresAt());
            assertEquals(100, second.getBean(ScoreService.class).getTopScores("add", "medium", 10).get(0).score());
        }
    }

    private java.util.List<String> carryMarks(QuestionView q) {
        int a = q.a(), b = q.b(), carry = 0;
        java.util.List<String> marks = new java.util.ArrayList<>(java.util.Collections.nCopies(q.questionColumns(), ""));
        for (int i = marks.size() - 1; i >= 0; i--) {
            boolean needed = a % 10 + b % 10 + carry >= 10;
            if (needed) marks.set(i, "1");
            carry = needed ? 1 : 0; a /= 10; b /= 10;
        }
        return marks;
    }

    private ConfigurableApplicationContext boot(String url) {
        return new SpringApplicationBuilder(AuthappApplication.class).run(
                "--spring.profiles.active=test", "--spring.datasource.url=" + url,
                "--spring.jpa.hibernate.ddl-auto=update", "--server.port=0",
                "--logging.level.root=WARN", "--logging.level.org.springframework=WARN",
                "--logging.level.org.hibernate.SQL=WARN", "--debug=false");
    }
}

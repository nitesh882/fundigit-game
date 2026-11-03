package com.demo.authapp;
import com.demo.authapp.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.test.context.ActiveProfiles;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "debug=false", "logging.level.org.springframework=WARN", "logging.level.org.hibernate.SQL=WARN"})
@ActiveProfiles("test")
@Import(GameApiTests.ClockConfig.class)
class GameApiTests {
    @LocalServerPort int port;
    @Autowired ScoreRepository scores;
    @Autowired QuestionAttemptRepository questions;
    @Autowired GameSessionRepository sessions;
    @Autowired UserRepository users;
    @Autowired MutableClock clock;
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();
    private String token;
    @TestConfiguration static class ClockConfig {
        @Bean @Primary MutableClock testClock() { return new MutableClock(); }
    }
    static class MutableClock extends Clock {
        private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-01-01T00:00:00Z"));
        void reset() { now.set(Instant.parse("2026-01-01T00:00:00Z")); }
        void advance(long seconds) { now.updateAndGet(value -> value.plusSeconds(seconds)); }
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now.get(); }
    }
    @BeforeEach void setup() throws Exception {
        scores.deleteAllInBatch(); questions.deleteAllInBatch(); sessions.deleteAllInBatch(); users.deleteAllInBatch();
        clock.reset(); token = signup("player@example.com");
    }
    record Reply(int status, JsonNode body) { }
    private Reply request(String method, String path, Object body, String bearer) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        if (bearer != null) builder.header("Authorization", "Bearer " + bearer);
        if (body != null) builder.header("Content-Type", "application/json");
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        HttpResponse<String> result = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        return new Reply(result.statusCode(), result.body().isBlank() ? json.nullNode() : json.readTree(result.body()));
    }
    private String signup(String email) throws Exception {
        Reply reply = request("POST", "/api/auth/signup", Map.of("username", "Player", "email", email, "password", "Password123!"), null);
        assertEquals(200, reply.status(), reply.body().toString());
        return reply.body().get("token").asText();
    }
    private JsonNode start(String mode, String level) throws Exception {
        Reply reply = request("POST", "/api/game/sessions", Map.of("mode", mode, "level", level, "requestId", UUID.randomUUID().toString()), token);
        assertEquals(200, reply.status(), reply.body().toString()); return reply.body();
    }
    private Map<String, Object> answerBody(JsonNode q, boolean correct) {
        return Map.of("questionId", q.get("id").asText(), "answerText", correct ? expected(q) : "999999999", "carryMap", carryMarks(q), "action", "answer");
    }
    private List<String> carryMarks(JsonNode q) {
        String op = q.get("operatorSymbol").asText();
        if (q.hasNonNull("denominatorA") || (!op.equals("+") && !op.equals("-"))) return List.of();
        int columns = q.get("questionColumns").asInt(), a = q.get("a").asInt(), b = q.get("b").asInt(), carry = 0;
        List<String> marks = new ArrayList<>(Collections.nCopies(columns, ""));
        for (int i = columns - 1; i >= 0; i--) {
            boolean needed = op.equals("+") ? a % 10 + b % 10 + carry >= 10 : a % 10 - carry < b % 10;
            if (needed) marks.set(i, "1");
            carry = needed ? 1 : 0; a /= 10; b /= 10;
        }
        return marks;
    }
    private String expected(JsonNode q) {
        long a = q.get("a").asLong(), b = q.get("b").asLong(); String op = q.get("operatorSymbol").asText();
        if (q.hasNonNull("denominatorA")) {
            long d1 = q.get("denominatorA").asLong(), d2 = q.get("denominatorB").asLong();
            return (a * d2 + (op.equals("-") ? -1 : 1) * b * d1) + "/" + (d1 * d2);
        }
        return String.valueOf(switch (op) { case "+" -> a + b; case "-" -> a - b; case "×" -> a * b; default -> a / b; });
    }
    private Reply submit(JsonNode session, Map<String, Object> body) throws Exception {
        return request("POST", "/api/game/sessions/" + session.get("id").asText() + "/answers", body, token);
    }
    static Stream<Arguments> configurations() { return GameServiceTests.configurations(); }

    @ParameterizedTest @MethodSource("configurations")
    void completeEveryModeAndDifficultyWithServerCalculatedScore(String mode, String level) throws Exception {
        JsonNode session = start(mode, level); String id = session.get("id").asText();
        int additions = 0, subtractions = 0;
        Map<String, Object> lastAnswer = null;
        for (int n = 0; n < 10; n++) {
            JsonNode q = session.get("question");
            String wire = q.toString();
            assertFalse(wire.contains("\"answer\"")); assertFalse(wire.contains("expected"));
            assertFalse(q.has("carryRequiredMap")); assertFalse(q.has("answerLength"));
            if (q.get("operatorSymbol").asText().equals("+")) additions++;
            if (q.get("operatorSymbol").asText().equals("-")) subtractions++;
            lastAnswer = answerBody(q, true);
            Reply response = submit(session, lastAnswer);
            assertEquals(200, response.status(), response.body().toString());
            assertEquals(10, response.body().get("result").get("earnedPoints").asInt());
            session = response.body().get("session");
        }
        assertEquals("COMPLETED", session.get("status").asText()); assertEquals(100, session.get("score").asInt());
        assertEquals(10, session.get("answeredQuestions").asInt()); assertTrue(session.get("question").isNull());
        if (mode.equals("fraction")) { assertEquals(5, additions); assertEquals(5, subtractions); }
        assertEquals(1, scores.countBySession_Id(id));
        Reply replay = submit(session, lastAnswer);
        assertEquals(200, replay.status());
        assertEquals(100, replay.body().get("session").get("score").asInt());
        assertEquals("COMPLETED", request("POST", "/api/game/sessions/" + id + "/end", null, token).body().get("status").asText());
        assertEquals(1, scores.countBySession_Id(id));
        Reply top = request("GET", "/api/leaderboard?mode=" + mode + "&difficulty=" + level, null, null);
        assertEquals(100, top.body().get(0).get("score").asInt());
        assertEquals("COMPLETED", top.body().get(0).get("status").asText());
        assertFalse(top.body().toString().contains("email")); assertFalse(top.body().toString().contains("password"));
    }

    @Test void authNormalizationValidationAndPublicUser() throws Exception {
        Reply duplicate = request("POST", "/api/auth/signup", Map.of("username", "Someone", "email", " PLAYER@EXAMPLE.COM ", "password", "Password123!"), null);
        assertEquals(409, duplicate.status());
        Reply login = request("POST", "/api/auth/login", Map.of("email", " PLAYER@EXAMPLE.COM ", "password", "Password123!"), null);
        assertEquals(200, login.status()); assertEquals("player@example.com", login.body().get("user").get("email").asText());
        assertFalse(login.body().get("user").has("password"));
        Reply me = request("GET", "/api/auth/me", null, token);
        assertEquals(200, me.status()); assertFalse(me.body().has("password"));
        assertEquals(401, request("POST", "/api/auth/login", Map.of("email", "player@example.com", "password", "wrong"), null).status());
        assertEquals(400, request("POST", "/api/auth/signup", Map.of("username", "x", "email", "bad", "password", "short"), null).status());
        assertEquals(400, request("POST", "/api/auth/signup", Map.of("username", "ValidName", "email", "new@example.com", "password", "a".repeat(73)), null).status());
    }
    @Test void unauthenticatedInvalidAndExpiredTokensCannotPlay() throws Exception {
        assertEquals(401, request("POST", "/api/game/sessions", Map.of(), null).status());
        assertEquals(401, request("GET", "/api/auth/me", null, "broken-token").status());
        assertEquals(401, request("GET", "/api/history", null, null).status());
        clock.advance(3601);
        assertEquals(401, request("GET", "/api/auth/me", null, token).status());
    }
    @Test void retrySafeCreationAnswersAndFinalization() throws Exception {
        Map<String, Object> body = Map.of("mode", "add", "level", "easy", "requestId", UUID.randomUUID().toString());
        JsonNode session = request("POST", "/api/game/sessions", body, token).body();
        JsonNode retry = request("POST", "/api/game/sessions", body, token).body();
        assertEquals(session.get("id"), retry.get("id")); assertEquals(1, sessions.count());
        Map<String, Object> answer = answerBody(session.get("question"), true);
        Reply first = submit(session, answer), second = submit(session, answer);
        assertEquals(first.body(), second.body());
        String path = "/api/game/sessions/" + session.get("id").asText() + "/end";
        assertEquals("ABANDONED", request("POST", path, null, token).body().get("status").asText());
        request("POST", path, null, token);
        assertEquals(1, scores.count()); assertEquals(10, scores.findAll().get(0).getScore());
        assertEquals(0, request("GET", "/api/leaderboard?mode=add&difficulty=easy", null, null).body().size());
        assertEquals("ABANDONED", request("GET", "/api/history", null, token).body().get(0).get("status").asText());
    }
    @Test void concurrentAnswersAwardPointsOnce() throws Exception {
        JsonNode session = start("mul", "hard");
        Map<String, Object> body = answerBody(session.get("question"), true);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch gate = new CountDownLatch(1);
            Callable<Reply> work = () -> { gate.await(); return submit(session, body); };
            Future<Reply> one = executor.submit(work), two = executor.submit(work); gate.countDown();
            assertEquals(200, one.get(15, TimeUnit.SECONDS).status()); assertEquals(200, two.get(15, TimeUnit.SECONDS).status());
            JsonNode current = request("GET", "/api/game/sessions/" + session.get("id").asText(), null, token).body();
            assertEquals(10, current.get("score").asInt()); assertEquals(1, current.get("answeredQuestions").asInt());
        } finally { executor.shutdownNow(); }
    }
    @Test void concurrentCreationReturnsOneRound() throws Exception {
        Map<String, Object> body = Map.of("mode", "add", "level", "easy", "requestId", UUID.randomUUID().toString());
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Reply> work = () -> request("POST", "/api/game/sessions", body, token);
            Future<Reply> one = executor.submit(work), two = executor.submit(work);
            Reply first = one.get(), second = two.get();
            assertEquals(200, first.status()); assertEquals(200, second.status());
            assertEquals(first.body().get("id"), second.body().get("id")); assertEquals(1, sessions.count());
        } finally { executor.shutdownNow(); }
    }
    @Test void concurrentFinalAnswerAndEndPersistOneConsistentResult() throws Exception {
        JsonNode session = start("mul", "easy");
        for (int i = 0; i < 9; i++) session = submit(session, answerBody(session.get("question"), true)).body().get("session");
        final JsonNode current = session;
        String path = "/api/game/sessions/" + session.get("id").asText() + "/end";
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch gate = new CountDownLatch(1);
            Future<Reply> answer = executor.submit(() -> { gate.await(); return submit(current, answerBody(current.get("question"), true)); });
            Future<Reply> end = executor.submit(() -> { gate.await(); return request("POST", path, null, token); });
            gate.countDown();
            Reply answerReply = answer.get(15, TimeUnit.SECONDS), endReply = end.get(15, TimeUnit.SECONDS);
            assertTrue(answerReply.status() == 200 || answerReply.status() == 409);
            assertEquals(200, endReply.status());
            assertEquals(1, scores.countBySession_Id(session.get("id").asText()));
            var result = scores.findAll().get(0);
            assertEquals(result.getStatus().equals("COMPLETED") ? 100 : 90, result.getScore());
            assertEquals(result.getStatus().equals("COMPLETED") ? 10 : 9, result.getAnsweredQuestions());
        } finally { executor.shutdownNow(); }
    }
    @Test void equalScoresUseStableCompletionTimeAndIdOrdering() throws Exception {
        for (int round = 0; round < 3; round++) {
            JsonNode session = start("div", "easy");
            for (int n = 0; n < 10; n++) session = submit(session, answerBody(session.get("question"), true)).body().get("session");
            if (round == 0) clock.advance(1);
        }
        JsonNode top = request("GET", "/api/leaderboard?mode=div&difficulty=easy", null, null).body();
        assertEquals(3, top.size());
        assertTrue(top.get(0).get("id").asLong() < top.get(1).get("id").asLong());
        assertTrue(top.get(1).get("id").asLong() < top.get(2).get("id").asLong());
        assertNotEquals(top.get(0).get("playedAt"), top.get(1).get("playedAt"));
        assertEquals(top.get(1).get("playedAt"), top.get(2).get("playedAt"));
        assertEquals(0, request("GET", "/api/leaderboard?mode=add&difficulty=easy", null, null).body().size());
    }
    @Test void invalidAnswersDoNotConsumeQuestionAndExpiredAnswersReceiveZero() throws Exception {
        JsonNode session = start("fraction", "easy"), q = session.get("question");
        assertEquals(400, submit(session, Map.of("questionId", q.get("id").asText(), "answerText", "1/0", "action", "answer")).status());
        JsonNode current = request("GET", "/api/game/sessions/" + session.get("id").asText(), null, token).body();
        assertEquals(0, current.get("answeredQuestions").asInt()); assertEquals(q.get("id"), current.get("question").get("id"));
        clock.advance(40);
        Reply late = submit(session, Map.of("questionId", q.get("id").asText(), "answerText", "", "action", "answer"));
        assertEquals(200, late.status()); assertTrue(late.body().get("result").get("timedOut").asBoolean());
        assertEquals(0, late.body().get("session").get("score").asInt());
        assertEquals(1, late.body().get("session").get("answeredQuestions").asInt());
    }
    @Test void skipsAndIncorrectAnswersReceiveZero() throws Exception {
        JsonNode session = start("sub", "medium");
        Reply wrong = submit(session, answerBody(session.get("question"), false));
        assertEquals(0, wrong.body().get("result").get("earnedPoints").asInt());
        session = wrong.body().get("session");
        Reply skip = submit(session, Map.of("questionId", session.get("question").get("id").asText(), "action", "skip"));
        assertEquals(0, skip.body().get("session").get("score").asInt()); assertEquals(2, skip.body().get("session").get("answeredQuestions").asInt());
    }
    @Test void carryMistakesReducePointsToEight() throws Exception {
        JsonNode session = start("add", "hard");
        // Fix operands in persisted question to exercise an otherwise random carry case.
        var stored = questions.findById(session.get("question").get("id").asText()).orElseThrow();
        stored.setA(99); stored.setB(1); questions.save(stored);
        Reply response = submit(session, Map.of("questionId", stored.getId(), "answerText", "100", "carryMap", List.of("", ""), "action", "answer"));
        assertEquals(8, response.body().get("result").get("earnedPoints").asInt());
        assertTrue(response.body().get("result").get("answerCorrect").asBoolean()); assertFalse(response.body().get("result").get("carryCorrect").asBoolean());
    }
    @Test void ownershipHistoryAndRetiredScoringAreEnforced() throws Exception {
        JsonNode session = start("add", "easy"); String other = signup("other@example.com");
        String path = "/api/game/sessions/" + session.get("id").asText();
        assertEquals(404, request("GET", path, null, other).status());
        assertEquals(404, request("POST", path + "/end", null, other).status());
        assertEquals(404, request("POST", path + "/answers", answerBody(session.get("question"), true), other).status());
        request("POST", path + "/end", null, token);
        assertEquals(0, request("GET", "/api/history", null, other).body().size());
        assertEquals(410, request("POST", "/api/score", Map.of("score", 999999), token).status());
        assertEquals(410, request("GET", "/api/game/question", null, token).status());
        assertEquals(410, request("POST", "/api/game/submit", Map.of(), token).status());
    }
    @Test void queryAndSessionValidationAndScoreInjection() throws Exception {
        assertEquals(400, request("GET", "/api/leaderboard?limit=0", null, null).status());
        assertEquals(400, request("GET", "/api/leaderboard?limit=101", null, null).status());
        assertEquals(400, request("GET", "/api/leaderboard?mode=bad", null, null).status());
        assertEquals(400, request("GET", "/api/history?limit=abc", null, token).status());
        assertEquals(400, request("POST", "/api/game/sessions", Map.of("mode", "bad", "level", "easy", "requestId", UUID.randomUUID().toString()), token).status());
        JsonNode session = start("mul", "easy");
        Map<String, Object> forged = new HashMap<>(answerBody(session.get("question"), true)); forged.put("score", 999999);
        Reply response = submit(session, forged);
        assertEquals(200, response.status()); assertEquals(10, response.body().get("session").get("score").asInt());
    }
}

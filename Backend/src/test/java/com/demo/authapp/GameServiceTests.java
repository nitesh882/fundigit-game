package com.demo.authapp;
import com.demo.authapp.config.ApiException;
import com.demo.authapp.model.QuestionAttempt;
import com.demo.authapp.service.GameService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;

class GameServiceTests {
    private final GameService game = new GameService();
    static Stream<Arguments> configurations() {
        return Stream.of("add", "sub", "mul", "div", "fraction")
            .flatMap(mode -> Stream.of("easy", "medium", "hard").map(level -> Arguments.of(mode, level)));
    }
    @ParameterizedTest @MethodSource("configurations")
    void generatedQuestionsRespectModeAndDifficulty(String mode, String level) {
        int max = level.equals("easy") ? 9 : level.equals("medium") ? 99 : 999;
        int seconds = level.equals("easy") ? 30 : level.equals("medium") ? 20 : 10;
        String ops = game.fractionOperations();
        assertEquals(5, ops.chars().filter(c -> c == '+').count());
        assertEquals(5, ops.chars().filter(c -> c == '-').count());
        for (int i = 0; i < 200; i++) {
            QuestionAttempt q = game.generate(mode, level, i % 10 + 1, ops, Instant.EPOCH);
            assertTrue(q.getA() >= 1 && q.getB() >= 1);
            assertEquals(seconds + (mode.equals("fraction") ? 10 : 0), q.getTimeLimitSeconds());
            assertEquals(Instant.EPOCH.plusSeconds(q.getTimeLimitSeconds()), q.getExpiresAt());
            if (mode.equals("fraction")) {
                int denMax = level.equals("easy") ? 6 : level.equals("medium") ? 12 : 20;
                assertTrue(q.getDenominatorA() <= denMax && q.getDenominatorB() <= denMax);
                assertTrue(q.getA() < q.getDenominatorA() && q.getB() < q.getDenominatorB());
                if (q.getOperatorSymbol().equals("-")) assertTrue(q.getA() * q.getDenominatorB() >= q.getB() * q.getDenominatorA());
            } else {
                assertTrue(q.getA() <= max && q.getB() <= max);
                if (mode.equals("div")) assertEquals(0, q.getA() % q.getB());
                if (mode.equals("sub")) assertTrue(q.getA() >= q.getB());
            }
        }
    }
    @Test void carryChainsAndBorrowChainsAreAccurate() {
        QuestionAttempt q = integer(999, 1, "+");
        assertEquals(List.of(true, true, true), game.carryMap(q));
        assertTrue(game.carryCorrect(q, List.of("1", "1", "1")));
        assertFalse(game.carryCorrect(q, List.of("", "1", "1")));
        q = integer(100, 1, "-");
        assertEquals(List.of(false, true, true), game.carryMap(q));
        assertTrue(game.carryCorrect(q, List.of("", "1", "1")));
        assertFalse(game.carryCorrect(q, List.of("1", "1", "1")));
    }
    @Test void answersIncludeZeroAndMaximumMultiplication() {
        assertTrue(game.answerCorrect(integer(1, 1, "-"), "0"));
        assertTrue(game.answerCorrect(integer(999, 999, "×"), "998001"));
        assertFalse(game.answerCorrect(integer(999, 999, "×"), "998000"));
        assertThrows(ApiException.class, () -> game.answerCorrect(integer(1, 1, "+"), ""));
        assertThrows(ApiException.class, () -> game.answerCorrect(integer(1, 1, "+"), "2.0"));
    }
    @Test void equivalentFractionsAndZeroAreAccepted() {
        QuestionAttempt q = integer(1, 1, "+"); q.setDenominatorA(2); q.setDenominatorB(2);
        assertTrue(game.answerCorrect(q, "1/1"));
        assertTrue(game.answerCorrect(q, "4/4"));
        assertFalse(game.answerCorrect(q, "1/2"));
        assertThrows(ApiException.class, () -> game.answerCorrect(q, "1/0"));
        assertThrows(ApiException.class, () -> game.answerCorrect(q, "1/"));
        assertThrows(ApiException.class, () -> game.answerCorrect(q, "1.0/1"));
        q.setOperatorSymbol("-");
        assertTrue(game.answerCorrect(q, "0/9"));
    }
    @Test void invalidModesAndLevelsAreRejected() {
        assertThrows(ApiException.class, () -> game.mode("unknown"));
        assertThrows(ApiException.class, () -> game.level("extreme"));
    }
    private QuestionAttempt integer(int a, int b, String op) {
        QuestionAttempt q = new QuestionAttempt(); q.setA(a); q.setB(b); q.setOperatorSymbol(op); return q;
    }
}

package com.demo.authapp.dto.game;
import java.time.Instant;
import java.util.List;
public final class SessionDtos {
    private SessionDtos() { }
    public record StartRequest(String mode, String level, String requestId) { }
    public record AnswerRequest(String questionId, String answerText, List<String> carryMap, String action) { }
    public record QuestionView(String id, int a, int b, Integer denominatorA, Integer denominatorB,
            String operatorSymbol, int questionColumns,
            int timeLimitSeconds, Instant expiresAt) { }
    public record SessionView(String id, String mode, String level, String status, int score,
            int answeredQuestions, int totalQuestions, Instant serverTime, QuestionView question) { }
    public record AnswerResult(boolean answerCorrect, boolean carryCorrect, int earnedPoints, boolean timedOut) { }
    public record AnswerResponse(SessionView session, AnswerResult result) { }
}

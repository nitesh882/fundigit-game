package com.demo.authapp.service;
import com.demo.authapp.config.ApiException;
import com.demo.authapp.dto.game.SessionDtos.*;
import com.demo.authapp.model.*;
import com.demo.authapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SessionService {
    private final UserRepository users;
    private final GameSessionRepository sessions;
    private final QuestionAttemptRepository questions;
    private final ScoreRepository scores;
    private final GameService game;
    private final Clock clock;

    @Transactional
    public SessionView start(String email, StartRequest request) {
        String mode = game.mode(request.mode()), level = game.level(request.level());
        String requestId = uuid(request.requestId(), "requestId");
        User user = users.findLockedByEmail(email).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in again."));
        Optional<GameSession> replay = sessions.findByUser_IdAndRequestId(user.getId(), requestId);
        if (replay.isPresent()) {
            GameSession existing = replay.get();
            if (!existing.getMode().equals(mode) || !existing.getLevel().equals(level))
                throw new ApiException(HttpStatus.CONFLICT, "This request ID was already used for a different round.");
            return view(existing);
        }
        GameSession session = new GameSession();
        session.setId(UUID.randomUUID().toString()); session.setUser(user); session.setRequestId(requestId);
        session.setMode(mode); session.setLevel(level); session.setStartedAt(clock.instant());
        if (mode.equals("fraction")) session.setFractionOperations(game.fractionOperations());
        sessions.save(session);
        generateNext(session);
        return view(session);
    }

    @Transactional(readOnly = true)
    public SessionView get(String email, String id) {
        GameSession session = sessions.findByIdAndUser_Email(id, email).orElseThrow(SessionService::notFound);
        return view(session);
    }

    @Transactional
    public AnswerResponse answer(String email, String id, AnswerRequest request) {
        GameSession session = sessions.findOwnedForUpdate(id, email).orElseThrow(SessionService::notFound);
        String questionId = uuid(request.questionId(), "questionId");
        QuestionAttempt question = questions.findByIdAndSession_Id(questionId, id).orElseThrow(SessionService::notFound);
        // A lost response can be retried even if the round has since finished.
        if (question.isAnswered()) return new AnswerResponse(view(session), result(question));
        if (!session.getStatus().equals("ACTIVE") || question.getNumber() != session.getAnsweredQuestions() + 1)
            throw new ApiException(HttpStatus.CONFLICT, "This question is no longer active.");
        String action = request.action() == null ? "answer" : request.action();
        if (!Set.of("answer", "skip", "timeout").contains(action))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose answer, skip, or timeout.");
        if (request.carryMap() != null && request.carryMap().size() > 10)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Too many carry entries.");
        boolean timedOut = !clock.instant().isBefore(question.getExpiresAt()) || action.equals("timeout");
        boolean correct = false;
        boolean carriesCorrect = game.carryCorrect(question, request.carryMap());
        if (action.equals("answer") && !timedOut) correct = game.answerCorrect(question, request.answerText());
        int earned = correct ? (carriesCorrect ? 10 : 8) : 0;
        question.setAnswered(true); question.setTimedOut(timedOut);
        question.setAnswerCorrect(correct); question.setCarryCorrect(carriesCorrect); question.setEarnedPoints(earned);
        questions.save(question);
        session.setScore(session.getScore() + earned);
        session.setAnsweredQuestions(session.getAnsweredQuestions() + 1);
        if (session.getAnsweredQuestions() == GameService.TOTAL_QUESTIONS) finish(session, "COMPLETED");
        else generateNext(session);
        return new AnswerResponse(view(session), result(question));
    }

    @Transactional
    public SessionView end(String email, String id) {
        GameSession session = sessions.findOwnedForUpdate(id, email).orElseThrow(SessionService::notFound);
        if (session.getStatus().equals("ACTIVE")) finish(session, "ABANDONED");
        return view(session);
    }

    private void generateNext(GameSession session) {
        QuestionAttempt next = game.generate(session.getMode(), session.getLevel(),
                session.getAnsweredQuestions() + 1, session.getFractionOperations(), clock.instant());
        next.setSession(session); questions.save(next);
    }

    private void finish(GameSession session, String status) {
        session.setStatus(status); session.setFinishedAt(clock.instant());
        Score score = new Score();
        score.setSession(session); score.setUser(session.getUser()); score.setName(session.getUser().getUsername());
        score.setScore(session.getScore()); score.setMode(session.getMode()); score.setDifficulty(session.getLevel());
        score.setPlayedAt(session.getFinishedAt()); score.setStatus(status); score.setAnsweredQuestions(session.getAnsweredQuestions());
        scores.save(score);
    }

    private SessionView view(GameSession session) {
        QuestionView current = session.getStatus().equals("ACTIVE")
                ? questions.findBySession_IdAndNumber(session.getId(), session.getAnsweredQuestions() + 1).map(game::view).orElseThrow()
                : null;
        return new SessionView(session.getId(), session.getMode(), session.getLevel(), session.getStatus(),
                session.getScore(), session.getAnsweredQuestions(), GameService.TOTAL_QUESTIONS, clock.instant(), current);
    }
    private AnswerResult result(QuestionAttempt q) {
        return new AnswerResult(q.isAnswerCorrect(), q.isCarryCorrect(), q.getEarnedPoints(), q.isTimedOut());
    }
    private static ApiException notFound() { return new ApiException(HttpStatus.NOT_FOUND, "Game or question not found."); }
    private static String uuid(String value, String field) {
        try {
            if (value == null || !UUID.fromString(value).toString().equalsIgnoreCase(value)) throw new IllegalArgumentException();
            return UUID.fromString(value).toString();
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, field + " must be a UUID.");
        }
    }
}

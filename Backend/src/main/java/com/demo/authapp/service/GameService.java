package com.demo.authapp.service;
import com.demo.authapp.config.ApiException;
import com.demo.authapp.dto.game.SessionDtos.QuestionView;
import com.demo.authapp.model.QuestionAttempt;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class GameService {
    public static final int TOTAL_QUESTIONS = 10;
    public String mode(String value) {
        if (value == null || !Set.of("add", "sub", "mul", "div", "fraction").contains(value))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid game mode.");
        return value;
    }
    public String level(String value) {
        if (value == null || !Set.of("easy", "medium", "hard").contains(value))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid difficulty.");
        return value;
    }
    public String fractionOperations() {
        List<Character> operations = new ArrayList<>(List.of('+', '+', '+', '+', '+', '-', '-', '-', '-', '-'));
        Collections.shuffle(operations);
        StringBuilder result = new StringBuilder();
        operations.forEach(result::append);
        return result.toString();
    }
    public QuestionAttempt generate(String mode, String level, int number, String fractionOperations, Instant now) {
        QuestionAttempt q = new QuestionAttempt();
        q.setId(UUID.randomUUID().toString());
        q.setNumber(number);
        int seconds = switch (level) { case "easy" -> 30; case "medium" -> 20; default -> 10; };
        int max = switch (level) { case "easy" -> 9; case "medium" -> 99; default -> 999; };
        int a = random(1, max), b = random(1, max);
        String symbol = switch (mode) { case "add" -> "+"; case "sub" -> "-"; case "mul" -> "×"; case "div" -> "÷"; default -> "+"; };
        if (mode.equals("sub") && a < b) { int temp = a; a = b; b = temp; }
        if (mode.equals("div")) { b = random(1, Math.min(9, max)); a = b * random(1, max / b); }
        if (mode.equals("fraction")) {
            int denominatorMax = switch (level) { case "easy" -> 6; case "medium" -> 12; default -> 20; };
            int d1 = random(2, denominatorMax), d2 = random(2, denominatorMax);
            a = random(1, d1 - 1); b = random(1, d2 - 1);
            symbol = String.valueOf(fractionOperations.charAt(number - 1));
            if (symbol.equals("-") && a * d2 < b * d1) {
                int t = a; a = b; b = t; t = d1; d1 = d2; d2 = t;
            }
            q.setDenominatorA(d1); q.setDenominatorB(d2); seconds += 10;
        }
        q.setA(a); q.setB(b); q.setOperatorSymbol(symbol);
        q.setTimeLimitSeconds(seconds); q.setExpiresAt(now.plusSeconds(seconds));
        return q;
    }
    private static int random(int min, int max) { return ThreadLocalRandom.current().nextInt(min, max + 1); }
    public int expected(QuestionAttempt q) {
        return switch (q.getOperatorSymbol()) {
            case "+" -> q.getA() + q.getB(); case "-" -> q.getA() - q.getB();
            case "×" -> q.getA() * q.getB(); case "÷" -> q.getA() / q.getB();
            default -> throw new IllegalStateException("Unsupported operator");
        };
    }
    public boolean answerCorrect(QuestionAttempt q, String text) {
        if (q.getDenominatorA() != null) {
            if (text == null || !text.matches("[0-9]{1,9}/[0-9]{1,9}"))
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enter both a numerator and a nonzero denominator.");
            String[] parts = text.split("/");
            long n = Long.parseLong(parts[0]), d = Long.parseLong(parts[1]);
            if (d == 0) throw new ApiException(HttpStatus.BAD_REQUEST, "The denominator cannot be zero.");
            long expectedN = (long) q.getA() * q.getDenominatorB()
                    + (q.getOperatorSymbol().equals("-") ? -1 : 1) * (long) q.getB() * q.getDenominatorA();
            long expectedD = (long) q.getDenominatorA() * q.getDenominatorB();
            return n * expectedD == expectedN * d;
        }
        if (text == null || !text.matches("[0-9]{1,9}"))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a whole-number answer.");
        return Long.parseLong(text) == expected(q);
    }
    public List<Boolean> carryMap(QuestionAttempt q) {
        if (q.getDenominatorA() != null || (!q.getOperatorSymbol().equals("+") && !q.getOperatorSymbol().equals("-"))) return List.of();
        int columns = Math.max(String.valueOf(q.getA()).length(), String.valueOf(q.getB()).length());
        List<Boolean> result = new ArrayList<>(Collections.nCopies(columns, false));
        int a = q.getA(), b = q.getB(), carry = 0;
        for (int i = columns - 1; i >= 0; i--) {
            boolean needed = q.getOperatorSymbol().equals("+") ? a % 10 + b % 10 + carry >= 10 : a % 10 - carry < b % 10;
            result.set(i, needed); carry = needed ? 1 : 0; a /= 10; b /= 10;
        }
        return result;
    }
    public boolean carryCorrect(QuestionAttempt q, List<String> entered) {
        List<Boolean> required = carryMap(q);
        if (required.isEmpty()) return true;
        for (int i = 0; i < required.size(); i++) {
            String value = entered != null && i < entered.size() && entered.get(i) != null ? entered.get(i).trim() : "";
            if (required.get(i) ? !value.equals("1") : !(value.isEmpty() || value.equals("0"))) return false;
        }
        return entered == null || entered.size() <= required.size();
    }
    public QuestionView view(QuestionAttempt q) {
        int columns = Math.max(String.valueOf(q.getA()).length(), String.valueOf(q.getB()).length());
        return new QuestionView(q.getId(), q.getA(), q.getB(), q.getDenominatorA(), q.getDenominatorB(),
                q.getOperatorSymbol(), columns, q.getTimeLimitSeconds(), q.getExpiresAt());
    }
}

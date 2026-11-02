package com.demo.authapp.service;

import com.demo.authapp.dto.game.GameQuestionResponse;
import com.demo.authapp.dto.game.GameSubmitRequest;
import com.demo.authapp.dto.game.GameSubmitResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class GameService {

    public GameQuestionResponse generateQuestion(String mode, String level) {
        String resolvedMode = normalizeMode(mode);
        String resolvedLevel = normalizeLevel(level);

        int[] operands = randomOperands(resolvedMode, resolvedLevel);
        int a = operands[0];
        int b = operands[1];

        int correctAnswer = correctAnswer(resolvedMode, a, b);
        int answerLength = String.valueOf(correctAnswer).length();
        int questionColumns = Math.max(String.valueOf(a).length(), String.valueOf(b).length());

        List<Boolean> carryRequiredMap = carryRequiredMap(resolvedMode, a, b, questionColumns);

        return new GameQuestionResponse(
                a,
                b,
                resolvedMode,
                resolvedLevel,
                operatorSymbol(resolvedMode),
                answerLength,
                questionColumns,
                carryRequiredMap,
                timeLimitSeconds(resolvedLevel)
        );
    }

    public GameSubmitResponse submit(GameSubmitRequest request) {
        String mode = normalizeMode(request.mode());
        String level = normalizeLevel(request.level());

        int expected = correctAnswer(mode, request.a(), request.b());
        boolean answerCorrect = parseAnswerCorrect(request.answerText(), expected);

        int columns = Math.max(String.valueOf(request.a()).length(), String.valueOf(request.b()).length());
        List<Boolean> requiredMap = carryRequiredMap(mode, request.a(), request.b(), columns);
        boolean carryCorrect = validateCarry(requiredMap, request.carryMap());

        int earnedPoints = 0;
        if (!request.timeout() && answerCorrect) {
            earnedPoints = (requiredMap.isEmpty() || carryCorrect) ? 10 : 8;
        }
        return new GameSubmitResponse(answerCorrect, carryCorrect, earnedPoints);
    }

    private static String normalizeMode(String mode) {
        if (mode == null) return "add";
        return switch (mode.trim().toLowerCase()) {
            case "add", "addition" -> "add";
            case "sub", "subtraction" -> "sub";
            case "mul", "multiplication" -> "mul";
            case "div", "division" -> "div";
            default -> "add";
        };
    }

    private static String normalizeLevel(String level) {
        if (level == null) return "medium";
        return switch (level.trim().toLowerCase()) {
            case "easy" -> "easy";
            case "medium" -> "medium";
            case "hard" -> "hard";
            default -> "medium";
        };
    }

    private static int timeLimitSeconds(String level) {
        return switch (level) {
            case "easy" -> 30;
            case "medium" -> 20;
            case "hard" -> 10;
            default -> 20;
        };
    }

    private static int rangeByLevel(String level) {
        return switch (level) {
            case "easy" -> 9;
            case "medium" -> 99;
            default -> 999;
        };
    }

    private static String operatorSymbol(String mode) {
        return switch (mode) {
            case "add" -> "+";
            case "sub" -> "-";
            case "mul" -> "×";
            case "div" -> "÷";
            default -> "?";
        };
    }

    private static int correctAnswer(String mode, int a, int b) {
        return switch (mode) {
            case "add" -> a + b;
            case "sub" -> a - b;
            case "mul" -> a * b;
            case "div" -> b == 0 ? 0 : Math.floorDiv(a, b);
            default -> 0;
        };
    }

    private static int[] randomOperands(String mode, String level) {
        int maxValue = rangeByLevel(level);
        int a = ThreadLocalRandom.current().nextInt(1, maxValue + 1);
        int b = ThreadLocalRandom.current().nextInt(1, maxValue + 1);

        if ("sub".equals(mode) && a < b) {
            int tmp = a;
            a = b;
            b = tmp;
        }

        if ("div".equals(mode)) {
            b = ThreadLocalRandom.current().nextInt(1, 10); // 1..9
            int maxMultiplier = Math.max(2, maxValue / b);
            int multiplier = ThreadLocalRandom.current().nextInt(1, maxMultiplier + 1);
            a = b * multiplier;
        }

        return new int[]{a, b};
    }

    private static List<Boolean> carryRequiredMap(String mode, int a, int b, int columns) {
        if (!"add".equals(mode) && !"sub".equals(mode)) return List.of();

        int[] digits1 = leftPadDigits(a, columns);
        int[] digits2 = leftPadDigits(b, columns);

        List<Boolean> required = new ArrayList<>(columns);
        for (int i = 0; i < columns; i += 1) required.add(false);

        if ("add".equals(mode)) {
            int carryIn = 0;
            for (int i = columns - 1; i >= 0; i -= 1) {
                int sum = digits1[i] + digits2[i] + carryIn;
                int carryOut = sum >= 10 ? 1 : 0;
                required.set(i, carryOut == 1);
                carryIn = carryOut;
            }
        } else {
            int borrowIn = 0;
            for (int i = columns - 1; i >= 0; i -= 1) {
                int top = digits1[i] - borrowIn;
                boolean needsBorrow = top < digits2[i];
                required.set(i, needsBorrow);
                borrowIn = needsBorrow ? 1 : 0;
            }
        }

        return required;
    }

    private static int[] leftPadDigits(int value, int columns) {
        String text = String.valueOf(value);
        if (text.length() < columns) {
            text = "0".repeat(columns - text.length()) + text;
        }
        int[] digits = new int[columns];
        for (int i = 0; i < columns; i += 1) {
            char c = text.charAt(i);
            digits[i] = Character.digit(c, 10);
        }
        return digits;
    }

    private static boolean parseAnswerCorrect(String answerText, int expected) {
        if (answerText == null) return false;
        String trimmed = answerText.trim();
        if (trimmed.isEmpty()) return false;
        try {
            int entered = Integer.parseInt(trimmed);
            return entered == expected;
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private static boolean validateCarry(List<Boolean> requiredMap, List<String> carryMap) {
        if (requiredMap == null || requiredMap.isEmpty()) return true;
        if (carryMap == null || carryMap.isEmpty()) return false;

        int size = Math.min(requiredMap.size(), carryMap.size());
        for (int i = 0; i < size; i += 1) {
            if (!Boolean.TRUE.equals(requiredMap.get(i))) continue;
            String value = carryMap.get(i);
            if (value == null) return false;
            if (!"1".equals(value.trim())) return false;
        }

        for (int i = size; i < requiredMap.size(); i += 1) {
            if (Boolean.TRUE.equals(requiredMap.get(i))) return false;
        }

        return true;
    }
}

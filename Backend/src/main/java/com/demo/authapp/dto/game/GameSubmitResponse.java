package com.demo.authapp.dto.game;

public record GameSubmitResponse(
        boolean answerCorrect,
        boolean carryCorrect,
        int earnedPoints
) {
}


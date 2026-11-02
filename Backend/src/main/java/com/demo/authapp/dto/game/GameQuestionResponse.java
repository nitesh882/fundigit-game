package com.demo.authapp.dto.game;

import java.util.List;

public record GameQuestionResponse(
        int a,
        int b,
        String mode,
        String level,
        String operatorSymbol,
        int answerLength,
        int questionColumns,
        List<Boolean> carryRequiredMap,
        int timeLimitSeconds
) {
}


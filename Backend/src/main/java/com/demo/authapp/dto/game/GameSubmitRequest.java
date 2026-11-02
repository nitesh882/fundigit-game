package com.demo.authapp.dto.game;

import java.util.List;

public record GameSubmitRequest(
        int a,
        int b,
        String mode,
        String level,
        String answerText,
        List<String> carryMap,
        boolean timeout
) {
}


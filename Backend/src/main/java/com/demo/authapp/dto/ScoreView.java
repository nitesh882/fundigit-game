package com.demo.authapp.dto;
import com.demo.authapp.model.Score;
import java.time.Instant;
public record ScoreView(Long id, String name, int score, String mode, String difficulty,
        Instant playedAt, String status, int answeredQuestions) {
    public static ScoreView from(Score score) {
        return new ScoreView(score.getId(), score.getName(), score.getScore(), score.getMode(),
                score.getDifficulty(), score.getPlayedAt(), score.getStatus(), score.getAnsweredQuestions());
    }
}

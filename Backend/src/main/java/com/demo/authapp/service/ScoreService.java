package com.demo.authapp.service;

import com.demo.authapp.model.Score;
import com.demo.authapp.model.User;
import com.demo.authapp.repository.ScoreRepository;
import com.demo.authapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScoreService {

    private final ScoreRepository scoreRepository;
    private final UserRepository userRepository;

    public Score saveScore(String email, int points, String mode, String difficulty) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Score score = Score.builder()
                .user(user)
                .name(user.getUsername())
                .score(points)
                .mode(mode != null ? mode : "add")
                .difficulty(difficulty != null ? difficulty : "medium")
                .playedAt(Instant.now())
                .build();

        return scoreRepository.save(score);
    }

    public List<Score> getTopScores(String mode, String difficulty, int limit) {
        String resolvedMode = (mode == null || mode.isBlank()) ? "add" : mode;
        String resolvedDifficulty = (difficulty == null || difficulty.isBlank()) ? "medium" : difficulty;
        return scoreRepository.findByModeAndDifficultyOrderByScoreDesc(resolvedMode, resolvedDifficulty, PageRequest.of(0, limit));
    }

    public List<Score> getUserHistory(String email, int limit) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return scoreRepository.findByUser_IdOrderByPlayedAtDesc(user.getId(), PageRequest.of(0, limit));
    }
}

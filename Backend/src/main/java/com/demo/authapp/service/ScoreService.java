package com.demo.authapp.service;
import com.demo.authapp.config.ApiException;
import com.demo.authapp.dto.ScoreView;
import com.demo.authapp.repository.ScoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScoreService {
    private final ScoreRepository scores;
    private final GameService game;
    @Transactional(readOnly = true)
    public List<ScoreView> getTopScores(String mode, String difficulty, int limit) {
        validateLimit(limit);
        return scores.findByModeAndDifficultyAndStatusOrderByScoreDescPlayedAtAscIdAsc(game.mode(mode), game.level(difficulty), "COMPLETED", PageRequest.of(0, limit))
                .stream().map(ScoreView::from).toList();
    }
    @Transactional(readOnly = true)
    public List<ScoreView> getUserHistory(String email, int limit) {
        validateLimit(limit);
        return scores.findByUser_EmailOrderByPlayedAtDescIdDesc(email, PageRequest.of(0, limit)).stream().map(ScoreView::from).toList();
    }
    private void validateLimit(int limit) {
        if (limit < 1 || limit > 100) throw new ApiException(HttpStatus.BAD_REQUEST, "Limit must be between 1 and 100.");
    }
}

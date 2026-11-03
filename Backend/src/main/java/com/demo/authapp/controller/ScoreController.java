package com.demo.authapp.controller;
import com.demo.authapp.config.ApiException;
import com.demo.authapp.dto.ScoreView;
import com.demo.authapp.service.ScoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScoreController {
    private final ScoreService scores;
    @GetMapping("/leaderboard") public List<ScoreView> leaderboard(
            @RequestParam(defaultValue = "add") String mode, @RequestParam(defaultValue = "medium") String difficulty,
            @RequestParam(defaultValue = "10") int limit) { return scores.getTopScores(mode, difficulty, limit); }
    @GetMapping("/history") public List<ScoreView> history(Authentication auth, @RequestParam(defaultValue = "50") int limit) { return scores.getUserHistory(auth.getName(), limit); }
    @PostMapping("/score") public void retired() { throw new ApiException(HttpStatus.GONE, "Scores are calculated and saved by game sessions."); }
}

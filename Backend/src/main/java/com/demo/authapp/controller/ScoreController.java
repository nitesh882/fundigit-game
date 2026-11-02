package com.demo.authapp.controller;

import com.demo.authapp.model.Score;
import com.demo.authapp.service.ScoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175"
})
public class ScoreController {

    private final ScoreService scoreService;

    @PostMapping("/score")
    public Score saveScore(@RequestBody Map<String, Object> request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName(); // Extracted from JwtFilter

        int points = ((Number) request.get("score")).intValue();
        String mode = (String) request.get("mode");
        String difficulty = (String) request.get("difficulty");

        return scoreService.saveScore(email, points, mode, difficulty);
    }

    @GetMapping("/leaderboard")
    public List<Score> getLeaderboard(
            @RequestParam(required = false, defaultValue = "add") String mode,
            @RequestParam(required = false, defaultValue = "medium") String difficulty,
            @RequestParam(defaultValue = "10") int limit) {
        return scoreService.getTopScores(mode, difficulty, limit);
    }

    @GetMapping("/history")
    public List<Score> getHistory(@RequestParam(defaultValue = "50") int limit) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return scoreService.getUserHistory(auth.getName(), limit);
    }
}

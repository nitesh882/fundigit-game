package com.demo.authapp.repository;

import com.demo.authapp.model.Score;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ScoreRepository extends JpaRepository<Score, Long> {

    List<Score> findByModeAndDifficultyOrderByScoreDesc(String mode, String difficulty, Pageable pageable);

    List<Score> findByUser_IdOrderByPlayedAtDesc(Long userId, Pageable pageable);
}

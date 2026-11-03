package com.demo.authapp.repository;
import com.demo.authapp.model.Score;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ScoreRepository extends JpaRepository<Score, Long> {
    List<Score> findByModeAndDifficultyAndStatusOrderByScoreDescPlayedAtAscIdAsc(String mode, String difficulty, String status, Pageable pageable);
    List<Score> findByUser_EmailOrderByPlayedAtDescIdDesc(String email, Pageable pageable);
    long countBySession_Id(String sessionId);
}

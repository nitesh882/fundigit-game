package com.demo.authapp.repository;
import com.demo.authapp.model.QuestionAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface QuestionAttemptRepository extends JpaRepository<QuestionAttempt, String> {
    Optional<QuestionAttempt> findBySession_IdAndNumber(String sessionId, int number);
    Optional<QuestionAttempt> findByIdAndSession_Id(String id, String sessionId);
}

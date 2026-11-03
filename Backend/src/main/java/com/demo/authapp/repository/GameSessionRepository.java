package com.demo.authapp.repository;
import com.demo.authapp.model.GameSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
public interface GameSessionRepository extends JpaRepository<GameSession, String> {
    Optional<GameSession> findByUser_IdAndRequestId(Long userId, String requestId);
    Optional<GameSession> findByIdAndUser_Email(String id, String email);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from GameSession s where s.id = :id and s.user.email = :email")
    Optional<GameSession> findOwnedForUpdate(@Param("id") String id, @Param("email") String email);
}

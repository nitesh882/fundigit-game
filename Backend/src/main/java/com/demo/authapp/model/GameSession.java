package com.demo.authapp.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "game_sessions", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "request_id"}))
@Getter @Setter @NoArgsConstructor
public class GameSession {
    @Id private String id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "request_id", nullable = false, length = 36) private String requestId;
    @Column(nullable = false) private String mode;
    @Column(nullable = false) private String level;
    @Column(nullable = false) private String status = "ACTIVE";
    private int score;
    private int answeredQuestions;
    @Column(nullable = false) private Instant startedAt;
    private Instant finishedAt;
    @Column(length = 10) private String fractionOperations;
    @Version private long version;
}

package com.demo.authapp.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "scores", indexes = {
    @Index(name = "idx_scores_mode_difficulty_score", columnList = "mode,difficulty,score"),
    @Index(name = "idx_scores_user_playedAt", columnList = "user_id,played_at")
})
@Getter @Setter @NoArgsConstructor
public class Score {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @OneToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "session_id", nullable = false, unique = true) private GameSession session;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private int score;
    @Column(nullable = false) private String mode;
    @Column(nullable = false) private String difficulty;
    @Column(name = "played_at", nullable = false) private Instant playedAt;
    @Column(nullable = false) private String status;
    private int answeredQuestions;
}

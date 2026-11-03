package com.demo.authapp.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "question_attempts", uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "question_number"}))
@Getter @Setter @NoArgsConstructor
public class QuestionAttempt {
    @Id private String id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "session_id", nullable = false) private GameSession session;
    @Column(name = "question_number", nullable = false) private int number;
    private int a;
    private int b;
    private Integer denominatorA;
    private Integer denominatorB;
    @Column(nullable = false) private String operatorSymbol;
    @Column(nullable = false) private Instant expiresAt;
    private int timeLimitSeconds;
    private boolean answered;
    private boolean answerCorrect;
    private boolean carryCorrect;
    private boolean timedOut;
    private int earnedPoints;
}

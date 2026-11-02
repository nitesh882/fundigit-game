package com.demo.authapp.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "scores", indexes = {
        @Index(name = "idx_scores_mode_difficulty_score", columnList = "mode,difficulty,score"),
        @Index(name = "idx_scores_user_playedAt", columnList = "user_id,played_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private String mode;

    @Column(nullable = false)
    private String difficulty;

    @Column(name = "played_at", nullable = false)
    private Instant playedAt;
}

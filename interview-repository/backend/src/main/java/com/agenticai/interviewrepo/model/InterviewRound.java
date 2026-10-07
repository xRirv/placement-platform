package com.agenticai.interviewrepo.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interview_round",
       uniqueConstraints = @UniqueConstraint(name = "uk_interview_round_order",
                                              columnNames = {"interview_id", "round_order"}))
public class InterviewRound {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interview_id", nullable = false)
    private InterviewExperience interview;

    @Column(name = "round_order", nullable = false)
    private int roundOrder;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "round", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder ASC")
    private List<Question> questions = new ArrayList<>();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public InterviewExperience getInterview() { return interview; }
    public void setInterview(InterviewExperience interview) { this.interview = interview; }
    public int getRoundOrder() { return roundOrder; }
    public void setRoundOrder(int roundOrder) { this.roundOrder = roundOrder; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public List<Question> getQuestions() { return questions; }
    public void setQuestions(List<Question> questions) { this.questions = questions; }
    public void addQuestion(Question question) { questions.add(question); question.setRound(this); }
}

package com.agenticai.interviewrepo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "interview_experience")
public class InterviewExperience {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne
    @JoinColumn(name = "alumni_id")
    private PlacedAlumni alumni;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(length = 100)
    private String role;

    @Column(name = "interview_date")
    private LocalDate interviewDate;

    @Column(length = 50)
    private String difficulty; // Easy | Medium | Hard

    @Column(columnDefinition = "TEXT")
    private String experience;

    @Column(name = "questions_summary", columnDefinition = "TEXT")
    private String questionsSummary;

    @Column(columnDefinition = "TEXT")
    private String tips;

    @Column(length = 50)
    private String status; // Pending | Approved | Rejected

    @Column(name = "interview_result", length = 50)
    private String interviewResult;

    @Column(name = "moderation_status", length = 50, nullable = false)
    private String moderationStatus = "PENDING";

    @Column(name = "consent_given", nullable = false)
    private boolean consentGiven;

    @Column(name = "consent_at")
    private LocalDateTime consentAt;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    @Column(name = "provenance", length = 100)
    private String provenance;

    @Column(name = "preparation", columnDefinition = "TEXT")
    private String preparation;

    @Column(name = "timeline", columnDefinition = "TEXT")
    private String timeline;

    @OneToMany(mappedBy = "interview", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("roundOrder ASC")
    private List<InterviewRound> rounds = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        if (this.submittedAt == null) this.submittedAt = this.createdAt;
        if (this.consentGiven && this.consentAt == null) this.consentAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }
    public PlacedAlumni getAlumni() { return alumni; }
    public void setAlumni(PlacedAlumni alumni) { this.alumni = alumni; }
    public User getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(User submittedBy) { this.submittedBy = submittedBy; }
    public Company getCompany() { return company; }
    public void setCompany(Company company) { this.company = company; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public LocalDate getInterviewDate() { return interviewDate; }
    public void setInterviewDate(LocalDate interviewDate) { this.interviewDate = interviewDate; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public String getQuestionsSummary() { return questionsSummary; }
    public void setQuestionsSummary(String questionsSummary) { this.questionsSummary = questionsSummary; }
    public String getTips() { return tips; }
    public void setTips(String tips) { this.tips = tips; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getInterviewResult() { return interviewResult; }
    public void setInterviewResult(String interviewResult) { this.interviewResult = interviewResult; }
    public String getModerationStatus() { return moderationStatus; }
    public void setModerationStatus(String moderationStatus) { this.moderationStatus = moderationStatus; }
    public boolean isConsentGiven() { return consentGiven; }
    public void setConsentGiven(boolean consentGiven) { this.consentGiven = consentGiven; }
    public LocalDateTime getConsentAt() { return consentAt; }
    public void setConsentAt(LocalDateTime consentAt) { this.consentAt = consentAt; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public String getProvenance() { return provenance; }
    public void setProvenance(String provenance) { this.provenance = provenance; }
    public String getPreparation() { return preparation; }
    public void setPreparation(String preparation) { this.preparation = preparation; }
    public String getTimeline() { return timeline; }
    public void setTimeline(String timeline) { this.timeline = timeline; }
    public List<InterviewRound> getRounds() { return rounds; }
    public void setRounds(List<InterviewRound> rounds) { this.rounds = rounds; }
    public void addRound(InterviewRound round) { rounds.add(round); round.setInterview(this); }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
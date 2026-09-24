package com.agenticai.interviewrepo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

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

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); this.updatedAt = this.createdAt; }

    @PreUpdate
    protected void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }
    public PlacedAlumni getAlumni() { return alumni; }
    public void setAlumni(PlacedAlumni alumni) { this.alumni = alumni; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
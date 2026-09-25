package com.agenticai.interviewrepo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "student")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "login_id", nullable = false, unique = true)
    private User login;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String college;

    @Column(length = 100)
    private String degree;

    @Column(name = "graduation_year")
    private Integer graduationYear;

    @Column(name = "resume_url", length = 255)
    private String resumeUrl;

    @Column(name = "linkedin_url", length = 255)
    private String linkedinUrl;

    @Column(name = "github_url", length = 255)
    private String githubUrl;

    @Column(columnDefinition = "TEXT")
    private String skills;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @ManyToOne
    @JoinColumn(name = "mentor_id")
    private Mentor mentor;

    @ManyToOne
    @JoinColumn(name = "admin_id")
    private Administrator admin;

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
    public User getLogin() { return login; }
    public void setLogin(User login) { this.login = login; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCollege() { return college; }
    public void setCollege(String college) { this.college = college; }
    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
    public Integer getGraduationYear() { return graduationYear; }
    public void setGraduationYear(Integer graduationYear) { this.graduationYear = graduationYear; }
    public String getResumeUrl() { return resumeUrl; }
    public void setResumeUrl(String resumeUrl) { this.resumeUrl = resumeUrl; }
    public String getLinkedinUrl() { return linkedinUrl; }
    public void setLinkedinUrl(String linkedinUrl) { this.linkedinUrl = linkedinUrl; }
    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public Mentor getMentor() { return mentor; }
    public void setMentor(Mentor mentor) { this.mentor = mentor; }
    public Administrator getAdmin() { return admin; }
    public void setAdmin(Administrator admin) { this.admin = admin; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getSkills() {return this.skills;}
    public void setSkills(String skills) {this.skills=skills;}
}
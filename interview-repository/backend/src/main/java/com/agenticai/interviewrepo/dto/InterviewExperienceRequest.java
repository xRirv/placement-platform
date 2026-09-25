package com.agenticai.interviewrepo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class InterviewExperienceRequest {
    @NotNull private UUID companyId;
    @NotBlank @Size(max = 100) private String role;
    private LocalDate interviewDate;
    @Size(max = 50) private String difficulty;
    private String experience;
    private String questionsSummary;
    private String tips;
    @Size(max = 50) private String interviewResult;
    @Size(max = 100) private String provenance;
    private String preparation;
    private String timeline;
    @NotNull private Boolean consentGiven;
    @Valid private List<RoundRequest> rounds = new ArrayList<>();

    public UUID getCompanyId() { return companyId; }
    public void setCompanyId(UUID companyId) { this.companyId = companyId; }
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
    public String getInterviewResult() { return interviewResult; }
    public void setInterviewResult(String interviewResult) { this.interviewResult = interviewResult; }
    public String getProvenance() { return provenance; }
    public void setProvenance(String provenance) { this.provenance = provenance; }
    public String getPreparation() { return preparation; }
    public void setPreparation(String preparation) { this.preparation = preparation; }
    public String getTimeline() { return timeline; }
    public void setTimeline(String timeline) { this.timeline = timeline; }
    public Boolean getConsentGiven() { return consentGiven; }
    public void setConsentGiven(Boolean consentGiven) { this.consentGiven = consentGiven; }
    public List<RoundRequest> getRounds() { return rounds; }
    public void setRounds(List<RoundRequest> rounds) { this.rounds = rounds; }

    public static class RoundRequest {
        @Positive private int roundOrder;
        @NotBlank @Size(max = 100) private String name;
        private String notes;
        @Valid private List<QuestionRequest> questions = new ArrayList<>();
        public int getRoundOrder() { return roundOrder; }
        public void setRoundOrder(int roundOrder) { this.roundOrder = roundOrder; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public List<QuestionRequest> getQuestions() { return questions; }
        public void setQuestions(List<QuestionRequest> questions) { this.questions = questions; }
    }

    public static class QuestionRequest {
        @Positive private int questionOrder;
        @NotBlank private String questionText;
        @Size(max = 100) private String topic;
        @Size(max = 50) private String difficulty;
        public int getQuestionOrder() { return questionOrder; }
        public void setQuestionOrder(int questionOrder) { this.questionOrder = questionOrder; }
        public String getQuestionText() { return questionText; }
        public void setQuestionText(String questionText) { this.questionText = questionText; }
        public String getTopic() { return topic; }
        public void setTopic(String topic) { this.topic = topic; }
        public String getDifficulty() { return difficulty; }
        public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    }
}

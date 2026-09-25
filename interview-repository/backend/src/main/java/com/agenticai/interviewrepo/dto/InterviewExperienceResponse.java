package com.agenticai.interviewrepo.dto;

import com.agenticai.interviewrepo.model.InterviewExperience;
import com.agenticai.interviewrepo.model.InterviewRound;
import com.agenticai.interviewrepo.model.Question;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record InterviewExperienceResponse(
        UUID id, UUID companyId, UUID submittedBy, String role, LocalDate interviewDate,
        String difficulty, String experience, String questionsSummary, String tips,
        String interviewResult, String moderationStatus, boolean consentGiven,
        LocalDateTime consentAt, LocalDateTime submittedAt, String provenance,
        String preparation, String timeline, List<RoundResponse> rounds) {
    public static InterviewExperienceResponse from(InterviewExperience value) {
        return new InterviewExperienceResponse(value.getId(), value.getCompany().getId(),
                value.getSubmittedBy().getId(), value.getRole(), value.getInterviewDate(),
                value.getDifficulty(), value.getExperience(), value.getQuestionsSummary(),
                value.getTips(), value.getInterviewResult(), value.getModerationStatus(),
                value.isConsentGiven(), value.getConsentAt(), value.getSubmittedAt(),
                value.getProvenance(), value.getPreparation(), value.getTimeline(),
                value.getRounds().stream().map(RoundResponse::from).toList());
    }
    public record RoundResponse(UUID id, int roundOrder, String name, String notes,
                                List<QuestionResponse> questions) {
        static RoundResponse from(InterviewRound round) {
            return new RoundResponse(round.getId(), round.getRoundOrder(), round.getName(),
                    round.getNotes(), round.getQuestions().stream().map(QuestionResponse::from).toList());
        }
    }
    public record QuestionResponse(UUID id, int questionOrder, String questionText,
                                   String topic, String difficulty) {
        static QuestionResponse from(Question question) {
            return new QuestionResponse(question.getId(), question.getQuestionOrder(),
                    question.getQuestionText(), question.getTopic(), question.getDifficulty());
        }
    }
}

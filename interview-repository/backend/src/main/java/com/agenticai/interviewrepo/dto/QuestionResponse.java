package com.agenticai.interviewrepo.dto;

import com.agenticai.interviewrepo.model.InterviewExperience;
import com.agenticai.interviewrepo.model.Question;
import java.time.LocalDate;
import java.util.UUID;

public record QuestionResponse(UUID id, String questionText, String category, String topic, String difficulty,
                               Integer questionOrder, String roundName, UUID interviewId, UUID companyId,
                               String companyName, String role, LocalDate interviewDate) {
    public static QuestionResponse from(Question q) {
        InterviewExperience i = q.getInterview();
        return new QuestionResponse(q.getId(), q.getQuestionText(), q.getCategory(), q.getTopic(), q.getDifficulty(),
                q.getQuestionOrder(), q.getRound() != null ? q.getRound().getName() : null, i.getId(),
                i.getCompany() != null ? i.getCompany().getId() : null,
                i.getCompany() != null ? i.getCompany().getName() : null, i.getRole(), i.getInterviewDate());
    }
}

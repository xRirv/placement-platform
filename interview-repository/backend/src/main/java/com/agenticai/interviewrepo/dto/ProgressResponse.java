package com.agenticai.interviewrepo.dto;

import com.agenticai.interviewrepo.model.Progress;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record ProgressResponse(UUID id, UUID studyPlanId, String topic, String category, Integer priority,
                               List<String> sampleQuestions, String status, Integer score, String notes,
                               LocalDateTime updatedAt) {
    public static ProgressResponse from(Progress p) {
        List<String> samples = p.getSampleQuestions() == null || p.getSampleQuestions().isBlank()
                ? List.of() : Arrays.stream(p.getSampleQuestions().split("\n")).filter(s -> !s.isBlank()).toList();
        return new ProgressResponse(p.getId(), p.getStudyPlan().getId(), p.getTopic(), p.getCategory(),
                p.getPriority(), samples, p.getStatus(), p.getScore(), p.getNotes(), p.getUpdatedAt());
    }
}

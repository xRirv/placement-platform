package com.agenticai.interviewrepo.dto;

import java.util.List;
import java.util.UUID;

/** Progress across all of the current student's study plans. */
public record ProgressSummaryResponse(int totalTopics, int notStarted, int inProgress, int completed,
                                      int completionPercent, Double averageScore, List<PlanProgress> plans) {
    public record PlanProgress(UUID studyPlanId, String title, String status, int totalTopics,
                               int completedTopics, int completionPercent) {}
}

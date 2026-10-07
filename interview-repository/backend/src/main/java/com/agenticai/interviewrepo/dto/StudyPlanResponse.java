package com.agenticai.interviewrepo.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A stored study plan. {@code plan} is the AI preparation plan (rounds, priority_topics,
 * schedule_suggestion, overall_tips, summary, ...) exactly as returned by the AI service.
 */
public record StudyPlanResponse(UUID id, UUID studentId, String title, String description, UUID targetCompanyId,
                                String targetCompanyName, String targetRole, Integer daysAvailable,
                                LocalDate startDate, LocalDate targetDate, String status, String source,
                                int totalTopics, int completedTopics, int completionPercent,
                                Map<String, Object> plan, List<ProgressResponse> progress,
                                LocalDateTime createdAt, LocalDateTime updatedAt) {}

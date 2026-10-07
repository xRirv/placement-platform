package com.agenticai.interviewrepo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** Create (studyPlanId + topic required) or partial update (null fields unchanged) of a progress item. */
public class ProgressRequest {
    private UUID studyPlanId;
    @Size(max = 100) private String topic;
    @Size(max = 50) private String category;
    @Size(max = 50) private String status; // Not Started | In Progress | Completed
    @Min(0) @Max(100) private Integer score;
    @Size(max = 5000) private String notes;
    public UUID getStudyPlanId() { return studyPlanId; }
    public void setStudyPlanId(UUID studyPlanId) { this.studyPlanId = studyPlanId; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}

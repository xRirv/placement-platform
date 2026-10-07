package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.model.InterviewExperience;
import com.agenticai.interviewrepo.model.InterviewRound;
import com.agenticai.interviewrepo.model.Question;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the ingest request body for Team B's /api/v1/internal/ingest from an approved experience.
 * Keys match Team B's `experiences` table (snake_case). Must be called inside a transaction
 * because rounds/questions are lazily loaded.
 */
public final class AiIngestPayload {

    private AiIngestPayload() {}

    public static Map<String, Object> from(InterviewExperience value) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("experience_id", value.getId().toString());
        payload.put("company_name", value.getCompany() != null ? value.getCompany().getName() : null);
        payload.put("role_title", value.getRole());
        payload.put("raw_content", rawContent(value));
        payload.put("questions_summary", value.getQuestionsSummary());
        payload.put("tips", value.getTips());
        payload.put("questions", questions(value));
        payload.put("interview_date", value.getInterviewDate() != null ? value.getInterviewDate().toString() : null);
        payload.put("difficulty", value.getDifficulty());
        return payload;
    }

    private static String rawContent(InterviewExperience value) {
        List<String> sections = new ArrayList<>();
        addSection(sections, null, value.getExperience());
        addSection(sections, "Preparation", value.getPreparation());
        addSection(sections, "Timeline", value.getTimeline());
        for (InterviewRound round : value.getRounds()) {
            String title = "Round " + round.getRoundOrder() + (round.getName() != null ? " - " + round.getName() : "");
            addSection(sections, title, round.getNotes() != null ? round.getNotes() : "");
        }
        return String.join("\n\n", sections);
    }

    private static void addSection(List<String> sections, String title, String body) {
        if (body == null || (title == null && body.isBlank())) return;
        sections.add(title == null ? body : title + ":\n" + body);
    }

    private static List<Map<String, Object>> questions(InterviewExperience value) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (InterviewRound round : value.getRounds()) {
            for (Question question : round.getQuestions()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("question_text", question.getQuestionText());
                item.put("difficulty", question.getDifficulty());
                item.put("category", question.getCategory());
                item.put("topic", question.getTopic());
                item.put("round", round.getName());
                result.add(item);
            }
        }
        return result;
    }
}

package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.ProgressRequest;
import com.agenticai.interviewrepo.dto.ProgressResponse;
import com.agenticai.interviewrepo.dto.ProgressSummaryResponse;
import com.agenticai.interviewrepo.model.Progress;
import com.agenticai.interviewrepo.model.Student;
import com.agenticai.interviewrepo.model.StudyPlan;
import com.agenticai.interviewrepo.repository.ProgressRepository;
import com.agenticai.interviewrepo.repository.StudyPlanRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static com.agenticai.interviewrepo.service.StudyPlanService.*;

/** Per-student progress on study plan topics. Every item belongs to a plan owned by the student. */
@Service
public class ProgressService {

    private static final Set<String> STATUSES = Set.of(NOT_STARTED, IN_PROGRESS, COMPLETED);

    private final ProgressRepository progress;
    private final StudyPlanRepository plans;
    private final StudyPlanService studyPlans;

    public ProgressService(ProgressRepository progress, StudyPlanRepository plans, StudyPlanService studyPlans) {
        this.progress = progress; this.plans = plans; this.studyPlans = studyPlans;
    }

    @Transactional
    public List<ProgressResponse> listForPlan(UUID studyPlanId) {
        StudyPlan plan = studyPlans.findReadable(studyPlanId);
        return progress.findByStudyPlan_IdOrderByPriorityAscCreatedAtAsc(plan.getId()).stream()
                .map(ProgressResponse::from).toList();
    }

    /** Adds a custom topic to one of the student's plans. */
    @Transactional
    public ProgressResponse create(ProgressRequest request) {
        if (request.getStudyPlanId() == null) throw badRequest("studyPlanId is required");
        if (request.getTopic() == null || request.getTopic().isBlank()) throw badRequest("topic is required");
        StudyPlan plan = studyPlans.findOwned(request.getStudyPlanId());
        Progress item = new Progress();
        item.setStudyPlan(plan);
        item.setTopic(request.getTopic().trim());
        item.setCategory(request.getCategory());
        item.setStatus(request.getStatus() != null ? validStatus(request.getStatus()) : NOT_STARTED);
        item.setScore(request.getScore());
        item.setNotes(request.getNotes());
        item = progress.save(item);
        studyPlans.refreshStatus(plan);
        return ProgressResponse.from(item);
    }

    /** Updates status / score / notes (null fields unchanged) and re-derives the plan status. */
    @Transactional
    public ProgressResponse update(UUID id, ProgressRequest request) {
        Progress item = findOwned(id);
        if (request.getStatus() != null) item.setStatus(validStatus(request.getStatus()));
        if (request.getScore() != null) item.setScore(request.getScore());
        if (request.getNotes() != null) item.setNotes(request.getNotes());
        if (request.getTopic() != null && !request.getTopic().isBlank()) item.setTopic(request.getTopic().trim());
        if (request.getCategory() != null) item.setCategory(request.getCategory());
        item = progress.save(item);
        studyPlans.refreshStatus(item.getStudyPlan());
        return ProgressResponse.from(item);
    }

    @Transactional
    public void delete(UUID id) {
        Progress item = findOwned(id);
        StudyPlan plan = item.getStudyPlan();
        progress.delete(item);
        progress.flush();
        studyPlans.refreshStatus(plan);
    }

    /** Totals across all of the current student's plans. */
    @Transactional
    public ProgressSummaryResponse summary() {
        Student student = studyPlans.currentStudent();
        List<Progress> all = progress.findByStudyPlan_Student_Id(student.getId());
        int notStarted = count(all, NOT_STARTED), inProgress = count(all, IN_PROGRESS), completed = count(all, COMPLETED);
        OptionalDouble avg = all.stream().filter(p -> p.getScore() != null).mapToInt(Progress::getScore).average();

        Map<UUID, List<Progress>> byPlan = new HashMap<>();
        for (Progress p : all) byPlan.computeIfAbsent(p.getStudyPlan().getId(), k -> new ArrayList<>()).add(p);
        List<ProgressSummaryResponse.PlanProgress> perPlan = plans.findByStudent_IdOrderByCreatedAtDesc(student.getId())
                .stream().map(plan -> {
                    List<Progress> items = byPlan.getOrDefault(plan.getId(), List.of());
                    int done = count(items, COMPLETED);
                    return new ProgressSummaryResponse.PlanProgress(plan.getId(), plan.getTitle(), plan.getStatus(),
                            items.size(), done, percent(done, items.size()));
                }).toList();

        return new ProgressSummaryResponse(all.size(), notStarted, inProgress, completed,
                percent(completed, all.size()), avg.isPresent() ? Math.round(avg.getAsDouble() * 10) / 10.0 : null,
                perPlan);
    }

    private Progress findOwned(UUID id) {
        Progress item = progress.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Progress item not found"));
        studyPlans.findOwned(item.getStudyPlan().getId()); // 404 unless the current student owns the plan
        return item;
    }

    private static String validStatus(String status) {
        return STATUSES.stream().filter(s -> s.equalsIgnoreCase(status.trim().replace('_', ' ')))
                .findFirst().orElseThrow(() -> badRequest("status must be one of " + STATUSES));
    }

    private static int count(List<Progress> items, String status) {
        return (int) items.stream().filter(p -> status.equals(p.getStatus())).count();
    }

    private static int percent(int part, int total) { return total == 0 ? 0 : Math.round(part * 100f / total); }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}

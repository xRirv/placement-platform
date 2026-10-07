package com.agenticai.interviewrepo;

import com.agenticai.interviewrepo.dto.ProgressRequest;
import com.agenticai.interviewrepo.dto.StudyPlanGenerateRequest;
import com.agenticai.interviewrepo.dto.StudyPlanResponse;
import com.agenticai.interviewrepo.model.*;
import com.agenticai.interviewrepo.repository.*;
import com.agenticai.interviewrepo.service.AiServiceClient;
import com.agenticai.interviewrepo.service.CurrentUserService;
import com.agenticai.interviewrepo.service.ProgressService;
import com.agenticai.interviewrepo.service.StudyPlanService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StudyPlanAndProgressServiceTest {
    @Mock StudyPlanRepository plans;
    @Mock ProgressRepository progress;
    @Mock StudentRepository students;
    @Mock CompanyRepository companies;
    @Mock CurrentUserService currentUser;
    @Mock AiServiceClient ai;

    StudyPlanService studyPlans;
    ProgressService progressService;
    User user;
    Student student;

    @BeforeEach
    void setUp() {
        // Direct provisioning (no transaction manager needed in unit tests).
        com.agenticai.interviewrepo.service.ProvisioningHelper provisioning = mock(com.agenticai.interviewrepo.service.ProvisioningHelper.class);
        when(provisioning.getOrCreate(any(), any())).thenAnswer(inv -> {
            java.util.function.Supplier<Optional<Object>> find = inv.getArgument(0);
            java.util.function.Supplier<Object> create = inv.getArgument(1);
            return find.get().orElseGet(create);
        });
        studyPlans = new StudyPlanService(plans, progress, students, companies, currentUser, ai, new ObjectMapper(), provisioning);
        progressService = new ProgressService(progress, plans, studyPlans);
        user = User.builder().id(UUID.randomUUID()).role(Role.STUDENT).build();
        student = new Student(); student.setId(UUID.randomUUID()); student.setLogin(user);
        when(currentUser.getCurrentUser()).thenReturn(user);
        when(students.findByLogin(user)).thenReturn(Optional.of(student));
        when(plans.save(any())).thenAnswer(inv -> {
            StudyPlan p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });
        when(progress.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Map<String, Object> aiPlan() {
        return Map.of(
                "company", "Amazon", "summary", "Focus on DSA.",
                "schedule_suggestion", "Days 1-5: arrays",
                "priority_topics", List.of(
                        Map.of("topic", "Arrays", "category", "DSA", "priority", 1,
                                "sample_questions", List.of("Two Sum", "Valid Anagram")),
                        Map.of("topic", "Trees", "category", "DSA", "priority", 2, "sample_questions", List.of())),
                "rounds", List.of(Map.of("round_type", "ONLINE_ASSESSMENT", "key_topics", List.of("Arrays"))));
    }

    @Test
    @SuppressWarnings("unchecked")
    void generateStoresAiPlanAndOneProgressItemPerTopic() {
        when(ai.preparation(anyMap())).thenReturn(aiPlan());
        StudyPlanGenerateRequest request = new StudyPlanGenerateRequest();
        request.setCompany("Amazon"); request.setRole("SDE-1"); request.setDaysAvailable(10);

        StudyPlanResponse response = studyPlans.generate(request);

        ArgumentCaptor<Map<String, Object>> sent = ArgumentCaptor.forClass(Map.class);
        verify(ai).preparation(sent.capture());
        assertEquals("Amazon", sent.getValue().get("company"));
        assertEquals(10, sent.getValue().get("days_available"));

        ArgumentCaptor<StudyPlan> savedPlan = ArgumentCaptor.forClass(StudyPlan.class);
        verify(plans).save(savedPlan.capture());
        assertSame(student, savedPlan.getValue().getStudent());
        assertTrue(savedPlan.getValue().getPlanJson().contains("Days 1-5"));
        assertEquals("AI", savedPlan.getValue().getSource());

        ArgumentCaptor<List<Progress>> items = ArgumentCaptor.forClass(List.class);
        verify(progress).saveAll(items.capture());
        assertEquals(List.of("Arrays", "Trees"), items.getValue().stream().map(Progress::getTopic).toList());
        assertEquals("Two Sum\nValid Anagram", items.getValue().get(0).getSampleQuestions());
        assertTrue(items.getValue().stream().allMatch(p -> "Not Started".equals(p.getStatus())));

        assertEquals("Amazon", response.targetCompanyName());
        assertEquals("Focus on DSA.", response.description());
        assertEquals(2, response.totalTopics());
        assertEquals("Days 1-5: arrays", response.plan().get("schedule_suggestion"));
    }

    @Test
    void generateFailsWithoutStoringWhenAiServiceIsDown() {
        when(ai.preparation(anyMap())).thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE));
        StudyPlanGenerateRequest request = new StudyPlanGenerateRequest();
        request.setCompany("Amazon");
        assertThrows(ResponseStatusException.class, () -> studyPlans.generate(request));
        verify(plans, never()).save(any());
        verify(progress, never()).saveAll(any());
    }

    @Test
    void nonStudentsCannotHaveStudyPlans() {
        user.setRole(Role.MENTOR);
        when(students.findByLogin(user)).thenReturn(Optional.empty());
        ResponseStatusException e = assertThrows(ResponseStatusException.class, studyPlans::listMine);
        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
        verify(students, never()).save(any());
    }

    @Test
    void selfRegisteredStudentGetsProfileCreatedOnFirstUse() {
        user.setName("Asha");
        when(students.findByLogin(user)).thenReturn(Optional.empty());
        when(students.save(any())).thenAnswer(inv -> inv.getArgument(0));
        assertTrue(studyPlans.listMine().isEmpty());
        verify(students).save(argThat(s -> s.getLogin() == user && "Asha".equals(s.getName())));
    }

    private StudyPlan planOwnedBy(Student owner) {
        StudyPlan plan = new StudyPlan();
        plan.setId(UUID.randomUUID()); plan.setStudent(owner); plan.setStatus("Not Started");
        when(plans.findById(plan.getId())).thenReturn(Optional.of(plan));
        return plan;
    }

    private Progress item(StudyPlan plan, String status) {
        Progress p = new Progress();
        p.setId(UUID.randomUUID()); p.setStudyPlan(plan); p.setTopic("Arrays"); p.setStatus(status);
        when(progress.findById(p.getId())).thenReturn(Optional.of(p));
        return p;
    }

    @Test
    void updatingProgressStoresItAndDerivesPlanStatus() {
        StudyPlan plan = planOwnedBy(student);
        Progress a = item(plan, "Not Started");
        Progress b = item(plan, "Completed");
        when(progress.findByStudyPlan_IdOrderByPriorityAscCreatedAtAsc(plan.getId())).thenReturn(List.of(a, b));

        ProgressRequest request = new ProgressRequest();
        request.setStatus("in_progress"); request.setScore(70); request.setNotes("halfway");
        var response = progressService.update(a.getId(), request);

        assertEquals("In Progress", response.status());
        assertEquals(70, response.score());
        assertEquals("In Progress", plan.getStatus());

        request.setStatus("Completed");
        progressService.update(a.getId(), request);
        assertEquals("Completed", plan.getStatus());
    }

    @Test
    void rejectsInvalidProgressStatus() {
        Progress a = item(planOwnedBy(student), "Not Started");
        ProgressRequest request = new ProgressRequest();
        request.setStatus("Done-ish");
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> progressService.update(a.getId(), request));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }

    @Test
    void studentsCannotTouchAnotherStudentsProgress() {
        Student other = new Student(); other.setId(UUID.randomUUID());
        Progress a = item(planOwnedBy(other), "Not Started");
        ProgressRequest request = new ProgressRequest();
        request.setStatus("Completed");
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> progressService.update(a.getId(), request));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
        verify(progress, never()).save(any());
    }

    @Test
    void summaryCountsOnlyTheCurrentStudentsTopics() {
        StudyPlan plan = planOwnedBy(student);
        plan.setTitle("Amazon plan");
        Progress a = item(plan, "Completed"); a.setScore(80);
        Progress b = item(plan, "In Progress");
        when(progress.findByStudyPlan_Student_Id(student.getId())).thenReturn(List.of(a, b));
        when(plans.findByStudent_IdOrderByCreatedAtDesc(student.getId())).thenReturn(List.of(plan));

        var summary = progressService.summary();
        assertEquals(2, summary.totalTopics());
        assertEquals(1, summary.completed());
        assertEquals(50, summary.completionPercent());
        assertEquals(80.0, summary.averageScore());
        assertEquals(50, summary.plans().get(0).completionPercent());
    }
}

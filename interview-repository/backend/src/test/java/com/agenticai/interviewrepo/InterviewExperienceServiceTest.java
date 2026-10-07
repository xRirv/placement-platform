package com.agenticai.interviewrepo;

import com.agenticai.interviewrepo.dto.InterviewExperienceRequest;
import com.agenticai.interviewrepo.dto.ModerationRequest;
import com.agenticai.interviewrepo.model.InterviewExperience;
import com.agenticai.interviewrepo.model.InterviewRound;
import com.agenticai.interviewrepo.model.Question;
import com.agenticai.interviewrepo.service.AiIngestListener;
import com.agenticai.interviewrepo.model.Company;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.*;
import com.agenticai.interviewrepo.service.CurrentUserService;
import com.agenticai.interviewrepo.service.InterviewExperienceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewExperienceServiceTest {
    @Mock InterviewExperienceRepository experiences;
    @Mock CompanyRepository companies;
    @Mock StudentRepository students;
    @Mock AlumniRepository alumni;
    @Mock AdministratorRepository administrators;
    @Mock ModerationLogRepository moderationLogs;
    @Mock CurrentUserService currentUser;
    @Mock ApplicationEventPublisher events;
    @InjectMocks InterviewExperienceService service;

    @Test
    void rejectsSubmissionWithoutConsent() {
        InterviewExperienceRequest request = new InterviewExperienceRequest();
        request.setConsentGiven(false);
        assertThrows(IllegalArgumentException.class, () -> service.create(request));
        verifyNoInteractions(currentUser, companies, experiences);
    }

    @Test
    void createsNestedRoundsAndQuestionsWithSeparateModerationStatus() {
        UUID companyId = UUID.randomUUID();
        Company company = new Company(); company.setId(companyId);
        User user = User.builder().id(UUID.randomUUID()).build();
        InterviewExperienceRequest request = new InterviewExperienceRequest();
        request.setCompanyId(companyId); request.setRole("Engineer"); request.setConsentGiven(true);
        InterviewExperienceRequest.RoundRequest round = new InterviewExperienceRequest.RoundRequest();
        round.setRoundOrder(1); round.setName("Technical");
        InterviewExperienceRequest.QuestionRequest question = new InterviewExperienceRequest.QuestionRequest();
        question.setQuestionOrder(1); question.setQuestionText("Explain indexing"); question.setTopic("SQL");
        round.setQuestions(java.util.List.of(question)); request.setRounds(java.util.List.of(round));
        when(currentUser.getCurrentUser()).thenReturn(user);
        when(companies.findById(companyId)).thenReturn(Optional.of(company));
        when(experiences.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.create(request);
        verify(experiences).save(argThat(value -> value.isConsentGiven()
                && "PENDING".equals(value.getModerationStatus())
                && "Engineer".equals(value.getRole())
                && value.getRounds().get(0).getQuestions().get(0).getQuestionOrder() == 1
                && "SQL".equals(value.getRounds().get(0).getQuestions().get(0).getTopic())));
        org.junit.jupiter.api.Assertions.assertNull(result.interviewResult());
        org.junit.jupiter.api.Assertions.assertEquals("PENDING", result.moderationStatus());
    }

    private InterviewExperience pendingExperience(UUID id) {
        Company company = new Company(); company.setName("Acme");
        InterviewExperience value = new InterviewExperience();
        value.setId(id); value.setCompany(company); value.setRole("SDE-1");
        value.setSubmittedBy(User.builder().id(UUID.randomUUID()).build());
        value.setExperience("Two rounds."); value.setModerationStatus("PENDING");
        InterviewRound round = new InterviewRound(); round.setRoundOrder(1); round.setName("Technical");
        Question question = new Question(); question.setQuestionOrder(1);
        question.setQuestionText("Reverse a linked list"); question.setTopic("DSA");
        round.addQuestion(question); value.addRound(round);
        when(experiences.findById(id)).thenReturn(Optional.of(value));
        when(currentUser.getCurrentUser()).thenReturn(User.builder().id(UUID.randomUUID()).build());
        return value;
    }

    private static ModerationRequest moderation(String status) {
        ModerationRequest request = new ModerationRequest(); request.setModerationStatus(status);
        return request;
    }

    @Test
    @SuppressWarnings("unchecked")
    void approvalPublishesAiIngestEventWithExperienceContent() {
        UUID id = UUID.randomUUID();
        pendingExperience(id);
        service.moderate(id, moderation("APPROVED"));
        verify(events).publishEvent(argThat((Object event) -> {
            if (!(event instanceof AiIngestListener.ExperienceApprovedEvent e)) return false;
            Map<String, Object> p = e.payload();
            List<Map<String, Object>> questions = (List<Map<String, Object>>) p.get("questions");
            return id.toString().equals(p.get("experience_id"))
                    && "Acme".equals(p.get("company_name"))
                    && "SDE-1".equals(p.get("role_title"))
                    && ((String) p.get("raw_content")).contains("Two rounds.")
                    && "Reverse a linked list".equals(questions.get(0).get("question_text"))
                    && "Technical".equals(questions.get(0).get("round"));
        }));
    }

    @Test
    void rejectionDoesNotTriggerAiIngest() {
        UUID id = UUID.randomUUID();
        pendingExperience(id);
        service.moderate(id, moderation("REJECTED"));
        verifyNoInteractions(events);
    }

    @Test
    void reApprovingAnApprovedExperienceDoesNotReIngest() {
        UUID id = UUID.randomUUID();
        pendingExperience(id).setModerationStatus("APPROVED");
        service.moderate(id, moderation("APPROVED"));
        verifyNoInteractions(events);
    }
}

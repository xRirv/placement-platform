package com.agenticai.interviewrepo;

import com.agenticai.interviewrepo.dto.InterviewExperienceRequest;
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
}

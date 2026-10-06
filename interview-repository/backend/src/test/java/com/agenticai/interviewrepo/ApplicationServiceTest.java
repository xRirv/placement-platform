package com.agenticai.interviewrepo;

import com.agenticai.interviewrepo.dto.ApplicationRequest;
import com.agenticai.interviewrepo.dto.ApplicationResponse;
import com.agenticai.interviewrepo.dto.ApplicationStatsResponse;
import com.agenticai.interviewrepo.dto.ApplicationStatusUpdateRequest;
import com.agenticai.interviewrepo.model.Application;
import com.agenticai.interviewrepo.model.Company;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.Student;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.ApplicationRepository;
import com.agenticai.interviewrepo.repository.CompanyRepository;
import com.agenticai.interviewrepo.repository.StudentRepository;
import com.agenticai.interviewrepo.service.ApplicationService;
import com.agenticai.interviewrepo.service.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private ApplicationService applicationService;

    private User user;
    private Student student;
    private Company company;

    @BeforeEach
    void setup() {
        user = User.builder()
                .id(UUID.randomUUID())
                .email("student@test.com")
                .role(Role.STUDENT)
                .build();

        student = new Student();
        student.setId(UUID.randomUUID());
        student.setName("Alice");
        student.setLogin(user);

        company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Stripe");
    }

    @Test
    void createApplication_success() {
        ApplicationRequest request = new ApplicationRequest(
                company.getId(), "Software Engineer", "Applied", LocalDate.now(), "Resume Screen", "Referral application"
        );

        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(studentRepository.findByLogin(user)).thenReturn(Optional.of(student));
        when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> {
            Application app = invocation.getArgument(0);
            app.setId(UUID.randomUUID());
            return app;
        });

        ApplicationResponse response = applicationService.create(request);

        assertNotNull(response);
        assertEquals("Software Engineer", response.role());
        assertEquals("Applied", response.status());
        assertEquals("Stripe", response.companyName());
        verify(applicationRepository).save(any(Application.class));
    }

    @Test
    void createApplication_companyNotFound_throwsException() {
        ApplicationRequest request = new ApplicationRequest(
                UUID.randomUUID(), "Dev", "Applied", LocalDate.now(), null, null
        );

        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(studentRepository.findByLogin(user)).thenReturn(Optional.of(student));
        when(companyRepository.findById(request.getCompanyId())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> applicationService.create(request));
    }

    @Test
    void updateApplicationStatus_success() {
        Application application = new Application();
        application.setId(UUID.randomUUID());
        application.setStudent(student);
        application.setCompany(company);
        application.setStatus("Applied");

        ApplicationStatusUpdateRequest request = new ApplicationStatusUpdateRequest("Interviewing", "Round 2 Technical", "Completed OA");

        when(applicationRepository.findById(application.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        ApplicationResponse response = applicationService.updateStatus(application.getId(), request);

        assertNotNull(response);
        assertEquals("Interviewing", response.status());
        assertEquals("Round 2 Technical", response.currentRound());
        verify(currentUserService).assertOwnerOrAdmin(user.getId());
    }

    @Test
    void getStats_success() {
        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(studentRepository.findByLogin(user)).thenReturn(Optional.of(student));
        when(applicationRepository.countByStudent(student)).thenReturn(5L);
        when(applicationRepository.countByStudentAndStatus(student, "Applied")).thenReturn(2L);
        when(applicationRepository.countByStudentAndStatus(student, "OA")).thenReturn(1L);
        when(applicationRepository.countByStudentAndStatus(student, "Interviewing")).thenReturn(1L);
        when(applicationRepository.countByStudentAndStatus(student, "Offer")).thenReturn(1L);
        when(applicationRepository.countByStudentAndStatus(student, "Rejected")).thenReturn(0L);

        ApplicationStatsResponse stats = applicationService.getStats(null);

        assertNotNull(stats);
        assertEquals(5, stats.total());
        assertEquals(2, stats.applied());
        assertEquals(1, stats.offer());
        assertEquals(1, stats.statusBreakdown().get("Interviewing"));
    }
}

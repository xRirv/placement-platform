package com.agenticai.interviewrepo.service;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ApplicationService {

    private static final Set<String> VALID_STATUSES = Set.of(
            "APPLIED", "OA", "INTERVIEWING", "OFFER", "REJECTED"
    );

    private final ApplicationRepository applicationRepository;
    private final CompanyRepository companyRepository;
    private final StudentRepository studentRepository;
    private final CurrentUserService currentUserService;

    public ApplicationService(ApplicationRepository applicationRepository,
                              CompanyRepository companyRepository,
                              StudentRepository studentRepository,
                              CurrentUserService currentUserService) {
        this.applicationRepository = applicationRepository;
        this.companyRepository = companyRepository;
        this.studentRepository = studentRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public ApplicationResponse create(ApplicationRequest request) {
        Student student = resolveCurrentStudent();

        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + request.getCompanyId()));

        String status = normalizeStatus(request.getStatus(), "Applied");

        Application application = new Application();
        application.setStudent(student);
        application.setCompany(company);
        application.setRole(request.getRole().trim());
        application.setStatus(status);
        application.setAppliedDate(request.getAppliedDate() != null ? request.getAppliedDate() : LocalDate.now());
        application.setCurrentRound(request.getCurrentRound() != null ? request.getCurrentRound().trim() : null);
        application.setNotes(request.getNotes());

        Application saved = applicationRepository.save(application);
        return ApplicationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public ApplicationResponse get(UUID id) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with id: " + id));

        currentUserService.assertOwnerOrAdmin(application.getStudent().getLogin().getId());
        return ApplicationResponse.from(application);
    }

    @Transactional(readOnly = true)
    public Page<ApplicationResponse> list(String status, UUID studentId, Pageable pageable) {
        User currentUser = currentUserService.getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;

        Page<Application> page;
        if (isAdmin && studentId != null) {
            Student student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + studentId));
            page = filterByStudentAndStatus(student, status, pageable);
        } else if (isAdmin && studentId == null) {
            if (status != null && !status.isBlank()) {
                String normalizedStatus = normalizeStatus(status, null);
                page = applicationRepository.findByStatus(normalizedStatus, pageable);
            } else {
                page = applicationRepository.findAll(pageable);
            }
        } else {
            Student student = studentRepository.findByLogin(currentUser)
                    .orElseThrow(() -> new IllegalStateException("Student profile not found. Please create your profile first."));
            page = filterByStudentAndStatus(student, status, pageable);
        }

        return page.map(ApplicationResponse::from);
    }

    @Transactional
    public ApplicationResponse update(UUID id, ApplicationRequest request) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with id: " + id));

        currentUserService.assertOwnerOrAdmin(application.getStudent().getLogin().getId());

        if (request.getCompanyId() != null && !request.getCompanyId().equals(application.getCompany().getId())) {
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + request.getCompanyId()));
            application.setCompany(company);
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            application.setRole(request.getRole().trim());
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            application.setStatus(normalizeStatus(request.getStatus(), application.getStatus()));
        }

        if (request.getAppliedDate() != null) {
            application.setAppliedDate(request.getAppliedDate());
        }

        if (request.getCurrentRound() != null) {
            application.setCurrentRound(request.getCurrentRound().trim());
        }

        if (request.getNotes() != null) {
            application.setNotes(request.getNotes());
        }

        Application updated = applicationRepository.save(application);
        return ApplicationResponse.from(updated);
    }

    @Transactional
    public ApplicationResponse updateStatus(UUID id, ApplicationStatusUpdateRequest request) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with id: " + id));

        currentUserService.assertOwnerOrAdmin(application.getStudent().getLogin().getId());

        String normalizedStatus = normalizeStatus(request.getStatus(), null);
        application.setStatus(normalizedStatus);

        if (request.getCurrentRound() != null) {
            application.setCurrentRound(request.getCurrentRound().trim());
        }

        if (request.getNotes() != null) {
            application.setNotes(request.getNotes());
        }

        Application updated = applicationRepository.save(application);
        return ApplicationResponse.from(updated);
    }

    @Transactional
    public void delete(UUID id) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with id: " + id));

        currentUserService.assertOwnerOrAdmin(application.getStudent().getLogin().getId());
        applicationRepository.delete(application);
    }

    @Transactional(readOnly = true)
    public ApplicationStatsResponse getStats(UUID studentId) {
        User currentUser = currentUserService.getCurrentUser();
        Student student;

        if (currentUser.getRole() == Role.ADMIN && studentId != null) {
            student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + studentId));
        } else {
            student = studentRepository.findByLogin(currentUser)
                    .orElseThrow(() -> new IllegalStateException("Student profile not found. Please create your profile first."));
        }

        long total = applicationRepository.countByStudent(student);
        long applied = applicationRepository.countByStudentAndStatus(student, "Applied");
        long oa = applicationRepository.countByStudentAndStatus(student, "OA");
        long interviewing = applicationRepository.countByStudentAndStatus(student, "Interviewing");
        long offer = applicationRepository.countByStudentAndStatus(student, "Offer");
        long rejected = applicationRepository.countByStudentAndStatus(student, "Rejected");

        Map<String, Long> breakdown = new LinkedHashMap<>();
        breakdown.put("Applied", applied);
        breakdown.put("OA", oa);
        breakdown.put("Interviewing", interviewing);
        breakdown.put("Offer", offer);
        breakdown.put("Rejected", rejected);

        return new ApplicationStatsResponse(total, applied, oa, interviewing, offer, rejected, breakdown);
    }

    private Page<Application> filterByStudentAndStatus(Student student, String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            String normalizedStatus = normalizeStatus(status, null);
            return applicationRepository.findByStudentAndStatus(student, normalizedStatus, pageable);
        }
        return applicationRepository.findByStudent(student, pageable);
    }

    private Student resolveCurrentStudent() {
        User currentUser = currentUserService.getCurrentUser();
        return studentRepository.findByLogin(currentUser)
                .orElseThrow(() -> new IllegalStateException("Student profile not found for user: " + currentUser.getEmail()
                        + ". Please create your student profile first."));
    }

    private String normalizeStatus(String status, String defaultStatus) {
        if (status == null || status.isBlank()) {
            if (defaultStatus != null) return defaultStatus;
            throw new IllegalArgumentException("Status cannot be empty");
        }

        String upper = status.trim().toUpperCase();
        if (!VALID_STATUSES.contains(upper)) {
            throw new IllegalArgumentException("Invalid status: '" + status + "'. Valid statuses are: Applied, OA, Interviewing, Offer, Rejected");
        }

        // Return canonical capitalization
        return switch (upper) {
            case "APPLIED" -> "Applied";
            case "OA" -> "OA";
            case "INTERVIEWING" -> "Interviewing";
            case "OFFER" -> "Offer";
            case "REJECTED" -> "Rejected";
            default -> status.trim();
        };
    }
}

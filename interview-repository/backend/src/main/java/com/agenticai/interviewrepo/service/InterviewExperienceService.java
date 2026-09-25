package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.InterviewExperienceRequest;
import com.agenticai.interviewrepo.dto.InterviewExperienceResponse;
import com.agenticai.interviewrepo.dto.ModerationRequest;
import com.agenticai.interviewrepo.model.*;
import com.agenticai.interviewrepo.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.UUID;

@Service
public class InterviewExperienceService {
    private final InterviewExperienceRepository experiences;
    private final CompanyRepository companies;
    private final StudentRepository students;
    private final AlumniRepository alumni;
    private final AdministratorRepository administrators;
    private final ModerationLogRepository moderationLogs;
    private final CurrentUserService currentUser;

    public InterviewExperienceService(InterviewExperienceRepository experiences,
            CompanyRepository companies, StudentRepository students, AlumniRepository alumni,
            AdministratorRepository administrators, ModerationLogRepository moderationLogs,
            CurrentUserService currentUser) {
        this.experiences = experiences; this.companies = companies; this.students = students;
        this.alumni = alumni; this.administrators = administrators; this.moderationLogs = moderationLogs;
        this.currentUser = currentUser;
    }

    @Transactional
    public InterviewExperienceResponse create(InterviewExperienceRequest request) {
        if (!Boolean.TRUE.equals(request.getConsentGiven()))
            throw new IllegalArgumentException("Consent must be given before submitting an interview experience");
        validateOrdering(request);
        User submitter = currentUser.getCurrentUser();
        InterviewExperience value = new InterviewExperience();
        value.setSubmittedBy(submitter);
        value.setCompany(companies.findById(request.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Company not found")));
        students.findByLogin(submitter).ifPresent(value::setStudent);
        alumni.findByLogin(submitter).ifPresent(value::setAlumni);
        value.setRole(request.getRole()); value.setInterviewDate(request.getInterviewDate());
        value.setDifficulty(request.getDifficulty()); value.setExperience(request.getExperience());
        value.setQuestionsSummary(request.getQuestionsSummary()); value.setTips(request.getTips());
        value.setInterviewResult(request.getInterviewResult()); value.setProvenance(request.getProvenance());
        value.setPreparation(request.getPreparation()); value.setTimeline(request.getTimeline());
        value.setConsentGiven(true); value.setConsentAt(LocalDateTime.now());
        value.setSubmittedAt(LocalDateTime.now()); value.setModerationStatus("PENDING");
        for (InterviewExperienceRequest.RoundRequest roundRequest : request.getRounds()) {
            InterviewRound round = new InterviewRound();
            round.setRoundOrder(roundRequest.getRoundOrder()); round.setName(roundRequest.getName());
            round.setNotes(roundRequest.getNotes()); value.addRound(round);
            for (InterviewExperienceRequest.QuestionRequest questionRequest : roundRequest.getQuestions()) {
                Question question = new Question();
                question.setQuestionOrder(questionRequest.getQuestionOrder());
                question.setQuestionText(questionRequest.getQuestionText());
                question.setTopic(questionRequest.getTopic()); question.setDifficulty(questionRequest.getDifficulty());
                question.setInterview(value); round.addQuestion(question);
            }
        }
        return InterviewExperienceResponse.from(experiences.save(value));
    }

    @Transactional
    public InterviewExperienceResponse moderate(UUID id, ModerationRequest request) {
        if (!SetOfStatuses.contains(request.getModerationStatus()))
            throw new IllegalArgumentException("moderationStatus must be PENDING, APPROVED, or REJECTED");
        InterviewExperience value = experiences.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Interview experience not found"));
        User adminUser = currentUser.getCurrentUser();
        value.setModerationStatus(request.getModerationStatus());
        value.setStatus(request.getModerationStatus());
        administrators.findByLogin(adminUser).ifPresent(admin -> {
            ModerationLog log = new ModerationLog();
            log.setAdmin(admin); log.setEntityType("INTERVIEW_EXPERIENCE"); log.setEntityId(id);
            log.setAction(request.getModerationStatus()); log.setReason(request.getReason());
            moderationLogs.save(log);
        });
        return InterviewExperienceResponse.from(value);
    }

    @Transactional
    public InterviewExperienceResponse get(UUID id) {
        return InterviewExperienceResponse.from(experiences.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Interview experience not found")));
    }

    @Transactional
    public Page<InterviewExperienceResponse> list(UUID companyId, boolean includeUnmoderated, Pageable pageable) {
        Page<InterviewExperience> page = includeUnmoderated
                ? (companyId == null ? experiences.findAll(pageable)
                    : experiences.findByCompanyId(companyId, pageable))
                : (companyId == null ? experiences.findByModerationStatus("APPROVED", pageable)
                    : experiences.findByModerationStatusAndCompanyId("APPROVED", companyId, pageable));
        return page.map(InterviewExperienceResponse::from);
    }

    public boolean isAdmin() {
        return currentUser.getCurrentUser().getRole() == Role.ADMIN;
    }

    private void validateOrdering(InterviewExperienceRequest request) {
        HashSet<Integer> roundOrders = new HashSet<>();
        for (InterviewExperienceRequest.RoundRequest round : request.getRounds()) {
            if (!roundOrders.add(round.getRoundOrder())) throw new IllegalArgumentException("Round order values must be unique");
            HashSet<Integer> questionOrders = new HashSet<>();
            for (InterviewExperienceRequest.QuestionRequest question : round.getQuestions())
                if (!questionOrders.add(question.getQuestionOrder()))
                    throw new IllegalArgumentException("Question order values must be unique within a round");
        }
    }

    private static final class SetOfStatuses {
        static boolean contains(String value) { return "PENDING".equals(value) || "APPROVED".equals(value) || "REJECTED".equals(value); }
    }
}
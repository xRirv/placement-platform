package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.InterviewExperienceRequest;
import com.agenticai.interviewrepo.dto.InterviewExperienceResponse;
import com.agenticai.interviewrepo.dto.ModerationRequest;
import com.agenticai.interviewrepo.model.*;
import com.agenticai.interviewrepo.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
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
    private final ApplicationEventPublisher events;
    private final QuestionRepository questions;

    public InterviewExperienceService(InterviewExperienceRepository experiences,
            CompanyRepository companies, StudentRepository students, AlumniRepository alumni,
            AdministratorRepository administrators, ModerationLogRepository moderationLogs,
            CurrentUserService currentUser, ApplicationEventPublisher events, QuestionRepository questions) {
        this.experiences = experiences; this.companies = companies; this.students = students;
        this.alumni = alumni; this.administrators = administrators; this.moderationLogs = moderationLogs;
        this.currentUser = currentUser; this.events = events; this.questions = questions;
    }

    @Transactional
    public InterviewExperienceResponse create(InterviewExperienceRequest request) {
        if (!Boolean.TRUE.equals(request.getConsentGiven()))
            throw new IllegalArgumentException("Consent must be given before submitting an interview experience");
        validateOrdering(request);
        User submitter = currentUser.getCurrentUser();
        InterviewExperience value = new InterviewExperience();
        value.setSubmittedBy(submitter);
        students.findByLogin(submitter).ifPresent(value::setStudent);
        alumni.findByLogin(submitter).ifPresent(value::setAlumni);
        value.setSubmittedAt(LocalDateTime.now()); value.setModerationStatus("PENDING");
        applyRequest(value, request);
        return InterviewExperienceResponse.from(experiences.save(value));
    }

    /** Experiences submitted by the current user (any moderation status). */
    @Transactional
    public Page<InterviewExperienceResponse> listMine(Pageable pageable) {
        return experiences.findBySubmittedBy_Id(currentUser.getCurrentUser().getId(), pageable)
                .map(InterviewExperienceResponse::from);
    }

    /** Submitter or admin. A submitter's edit sends the experience back to moderation. */
    @Transactional
    public InterviewExperienceResponse update(UUID id, InterviewExperienceRequest request) {
        if (!Boolean.TRUE.equals(request.getConsentGiven()))
            throw new IllegalArgumentException("Consent must be given before submitting an interview experience");
        validateOrdering(request);
        InterviewExperience value = experiences.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview experience not found"));
        User user = requireOwnerOrAdmin(value);
        value.getRounds().clear();
        experiences.flush();
        applyRequest(value, request);
        if (user.getRole() != Role.ADMIN) { value.setModerationStatus("PENDING"); value.setStatus(legacyStatus("PENDING")); }
        return InterviewExperienceResponse.from(experiences.save(value));
    }

    /** Submitter or admin. */
    @Transactional
    public void delete(UUID id) {
        InterviewExperience value = experiences.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview experience not found"));
        requireOwnerOrAdmin(value);
        questions.deleteAll(questions.findByInterview_IdAndRoundIsNull(id));
        experiences.delete(value);
    }

    /**
     * Re-sends every APPROVED experience to the AI service (e.g. ones approved before the integration).
     * Ingest is idempotent on Team B's side (upsert by experience_id). Returns how many were queued.
     */
    @Transactional
    public int resyncApprovedToAi() {
        int count = 0;
        Pageable page = org.springframework.data.domain.PageRequest.of(0, 100);
        Page<InterviewExperience> batch;
        do {
            batch = experiences.findByModerationStatus("APPROVED", page);
            for (InterviewExperience value : batch)
                events.publishEvent(new AiIngestListener.ExperienceApprovedEvent(AiIngestPayload.from(value)));
            count += batch.getNumberOfElements();
            page = page.next();
        } while (batch.hasNext());
        return count;
    }

    /** The legacy `status` column has a DB check constraint: Pending | Approved | Rejected. */
    static String legacyStatus(String moderationStatus) {
        return switch (moderationStatus) {
            case "APPROVED" -> "Approved";
            case "REJECTED" -> "Rejected";
            default -> "Pending";
        };
    }

    private User requireOwnerOrAdmin(InterviewExperience value) {
        User user = currentUser.getCurrentUser();
        boolean owner = value.getSubmittedBy() != null && value.getSubmittedBy().getId().equals(user.getId());
        if (!owner && user.getRole() != Role.ADMIN)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only change your own interview experiences");
        return user;
    }

    /** Resolves the company by id, else by name (creating it if new). */
    private Company resolveCompany(InterviewExperienceRequest request) {
        if (request.getCompanyId() != null)
            return companies.findById(request.getCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        String name = request.getCompanyName() == null ? "" : request.getCompanyName().trim();
        if (name.isEmpty()) throw new IllegalArgumentException("companyId or companyName is required");
        return companies.findByNameIgnoreCase(name).orElseGet(() -> {
            Company company = new Company();
            company.setName(name);
            return companies.save(company);
        });
    }

    private void applyRequest(InterviewExperience value, InterviewExperienceRequest request) {
        value.setCompany(resolveCompany(request));
        value.setRole(request.getRole()); value.setInterviewDate(request.getInterviewDate());
        value.setDifficulty(request.getDifficulty()); value.setExperience(request.getExperience());
        value.setQuestionsSummary(request.getQuestionsSummary()); value.setTips(request.getTips());
        value.setInterviewResult(request.getInterviewResult()); value.setProvenance(request.getProvenance());
        value.setPreparation(request.getPreparation()); value.setTimeline(request.getTimeline());
        value.setConsentGiven(true); value.setConsentAt(LocalDateTime.now());
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
    }

    @Transactional
    public InterviewExperienceResponse moderate(UUID id, ModerationRequest request) {
        if (!SetOfStatuses.contains(request.getModerationStatus()))
            throw new IllegalArgumentException("moderationStatus must be PENDING, APPROVED, or REJECTED");
        InterviewExperience value = experiences.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Interview experience not found"));
        User adminUser = currentUser.getCurrentUser();
        boolean newlyApproved = "APPROVED".equals(request.getModerationStatus())
                && !"APPROVED".equals(value.getModerationStatus());
        value.setModerationStatus(request.getModerationStatus());
        value.setStatus(legacyStatus(request.getModerationStatus()));
        administrators.findByLogin(adminUser).ifPresent(admin -> {
            ModerationLog log = new ModerationLog();
            log.setAdmin(admin); log.setEntityType("INTERVIEW_EXPERIENCE"); log.setEntityId(id);
            log.setAction(request.getModerationStatus()); log.setReason(request.getReason());
            moderationLogs.save(log);
        });
        // Sent to the AI service after commit (see AiIngestListener); failures never affect approval.
        if (newlyApproved)
            events.publishEvent(new AiIngestListener.ExperienceApprovedEvent(AiIngestPayload.from(value)));
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
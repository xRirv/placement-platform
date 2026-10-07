package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.QuestionRequest;
import com.agenticai.interviewrepo.dto.QuestionResponse;
import com.agenticai.interviewrepo.model.*;
import com.agenticai.interviewrepo.repository.InterviewExperienceRepository;
import com.agenticai.interviewrepo.repository.QuestionRepository;
import jakarta.persistence.criteria.Join;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Question bank built from interview experiences. Everyone sees questions from APPROVED experiences;
 * the submitter (while the experience is pending) or an admin can add, edit and delete questions.
 */
@Service
public class QuestionService {

    private static final String APPROVED = "APPROVED";

    private final QuestionRepository questions;
    private final InterviewExperienceRepository experiences;
    private final CurrentUserService currentUser;

    public QuestionService(QuestionRepository questions, InterviewExperienceRepository experiences,
                           CurrentUserService currentUser) {
        this.questions = questions; this.experiences = experiences; this.currentUser = currentUser;
    }

    @Transactional
    public Page<QuestionResponse> search(String text, String topic, String difficulty, UUID companyId,
                                         Pageable pageable) {
        Specification<Question> spec = (root, query, cb) -> {
            Join<Question, InterviewExperience> interview = root.join("interview");
            var predicate = cb.equal(interview.get("moderationStatus"), APPROVED);
            if (notBlank(text))
                predicate = cb.and(predicate, cb.like(cb.lower(root.get("questionText")), like(text), '\\'));
            if (notBlank(topic))
                predicate = cb.and(predicate, cb.equal(cb.lower(root.get("topic")), topic.trim().toLowerCase()));
            if (notBlank(difficulty))
                predicate = cb.and(predicate, cb.equal(cb.lower(root.get("difficulty")), difficulty.trim().toLowerCase()));
            if (companyId != null)
                predicate = cb.and(predicate, cb.equal(interview.get("company").get("id"), companyId));
            return predicate;
        };
        return questions.findAll(spec, pageable).map(QuestionResponse::from);
    }

    @Transactional
    public QuestionResponse get(UUID id) {
        Question question = find(id);
        if (!APPROVED.equals(question.getInterview().getModerationStatus()) && !canEdit(question.getInterview()))
            throw notFound();
        return QuestionResponse.from(question);
    }

    public List<String> topics() {
        return questions.findApprovedTopics();
    }

    @Transactional
    public QuestionResponse addToExperience(UUID interviewId, QuestionRequest request) {
        InterviewExperience interview = experiences.findById(interviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview experience not found"));
        requireEdit(interview);
        Question question = new Question();
        question.setInterview(interview);
        apply(question, request);
        return QuestionResponse.from(questions.save(question));
    }

    @Transactional
    public QuestionResponse update(UUID id, QuestionRequest request) {
        Question question = find(id);
        requireEdit(question.getInterview());
        apply(question, request);
        return QuestionResponse.from(questions.save(question));
    }

    @Transactional
    public void delete(UUID id) {
        Question question = find(id);
        requireEdit(question.getInterview());
        if (question.getRound() != null) question.getRound().getQuestions().remove(question);
        questions.delete(question);
    }

    private void apply(Question question, QuestionRequest request) {
        question.setQuestionText(request.getQuestionText().trim());
        question.setQuestionOrder(request.getQuestionOrder());
        question.setTopic(request.getTopic());
        question.setDifficulty(request.getDifficulty());
        question.setCategory(request.getCategory());
    }

    /** Admins always; the submitter only while the experience is not yet approved. */
    private boolean canEdit(InterviewExperience interview) {
        User user = currentUser.getCurrentUser();
        if (user.getRole() == Role.ADMIN) return true;
        return interview.getSubmittedBy() != null && interview.getSubmittedBy().getId().equals(user.getId())
                && !APPROVED.equals(interview.getModerationStatus());
    }

    private void requireEdit(InterviewExperience interview) {
        if (!canEdit(interview))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the submitter (before approval) or an admin can change these questions");
    }

    private Question find(UUID id) {
        return questions.findById(id).orElseThrow(QuestionService::notFound);
    }

    private static boolean notBlank(String value) { return value != null && !value.isBlank(); }

    private static String like(String text) {
        String escaped = text.trim().toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found");
    }
}

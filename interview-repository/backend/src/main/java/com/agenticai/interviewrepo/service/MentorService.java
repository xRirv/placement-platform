package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.InterviewExperienceResponse;
import com.agenticai.interviewrepo.dto.MentorProfileRequest;
import com.agenticai.interviewrepo.dto.MentorProfileResponse;
import com.agenticai.interviewrepo.dto.StudentProfileResponse;
import com.agenticai.interviewrepo.model.Mentor;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.Student;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.InterviewExperienceRepository;
import com.agenticai.interviewrepo.repository.MentorRepository;
import com.agenticai.interviewrepo.repository.StudentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class MentorService {

    private final MentorRepository mentorRepository;
    private final CurrentUserService currentUserService;
    private final StudentRepository studentRepository;
    private final StudentService studentService;
    private final InterviewExperienceRepository experiences;
    private final ProvisioningHelper provisioning;

    public MentorService(
            MentorRepository mentorRepository,
            CurrentUserService currentUserService,
            StudentRepository studentRepository,
            StudentService studentService,
            InterviewExperienceRepository experiences,
            ProvisioningHelper provisioning
    ) {
        this.mentorRepository = mentorRepository;
        this.currentUserService = currentUserService;
        this.studentRepository = studentRepository;
        this.studentService = studentService;
        this.experiences = experiences;
        this.provisioning = provisioning;
    }

    @Transactional(readOnly = true)
    public MentorProfileResponse getMyProfile() {
        return toResponse(currentMentor());
    }

    @Transactional
    public MentorProfileResponse updateMyProfile(MentorProfileRequest request) {
        Mentor mentor = currentMentor();
        if (request.getName() != null && !request.getName().isBlank()) mentor.setName(request.getName().trim());
        if (request.getBio() != null) mentor.setBio(request.getBio());
        if (request.getExpertise() != null) mentor.setExpertise(request.getExpertise());
        return toResponse(mentorRepository.save(mentor));
    }

    /** Students assigned to the current mentor. */
    @Transactional(readOnly = true)
    public List<StudentProfileResponse> getMyMentees() {
        Mentor mentor = currentMentor();
        return studentRepository.findByMentor_Id(mentor.getId()).stream().map(studentService::toResponse).toList();
    }

    /** Active students without a mentor, which the current mentor can take on. */
    @Transactional(readOnly = true)
    public List<StudentProfileResponse> getAvailableStudents() {
        currentMentor();
        return studentRepository.findByMentorIsNullAndLogin_IsActiveTrueOrderByNameAsc().stream()
                .map(studentService::toResponse).toList();
    }

    /** Assigns an unassigned student to the current mentor (idempotent if already theirs). */
    @Transactional
    public StudentProfileResponse assignMentee(UUID studentId) {
        Mentor mentor = currentMentor();
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
        if (student.getMentor() != null && !student.getMentor().getId().equals(mentor.getId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This student already has a mentor");
        student.setMentor(mentor);
        return studentService.toResponse(studentRepository.save(student));
    }

    /** Interview experiences submitted by one of the current mentor's mentees (any review status). */
    @Transactional(readOnly = true)
    public List<InterviewExperienceResponse> getMenteeExperiences(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
        User user = currentUserService.getCurrentUser();
        if (user.getRole() != Role.ADMIN) {
            Mentor mentor = currentMentor();
            if (student.getMentor() == null || !student.getMentor().getId().equals(mentor.getId()))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This student is not your mentee");
        }
        return experiences.findByStudent_Id(student.getId(),
                        PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "submittedAt")))
                .map(InterviewExperienceResponse::from).getContent();
    }

    /**
     * The current user's mentor profile. A MENTOR account without a profile row (e.g. created
     * outside the admin flow) gets one on first use; other roles get a clear 403.
     */
    private Mentor currentMentor() {
        User user = currentUserService.getCurrentUser();
        if (user.getRole() != Role.MENTOR)
            return mentorRepository.findByLogin(user).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.FORBIDDEN, "Only mentors have a mentor profile"));
        return provisioning.getOrCreate(() -> mentorRepository.findByLogin(user), () -> {
            Mentor mentor = new Mentor();
            mentor.setLogin(user);
            mentor.setName(displayName(user));
            return mentorRepository.save(mentor);
        });
    }

    static String displayName(User user) {
        String name = user.getName() != null && !user.getName().isBlank() ? user.getName()
                : user.getEmail() != null ? user.getEmail().split("@")[0] : "Mentor";
        return name.length() > 100 ? name.substring(0, 100) : name;
    }

    private MentorProfileResponse toResponse(Mentor mentor) {
        MentorProfileResponse response = new MentorProfileResponse();
        response.setId(mentor.getId());
        response.setName(mentor.getName());
        if (mentor.getLogin() != null) response.setEmail(mentor.getLogin().getEmail());
        response.setBio(mentor.getBio());
        response.setExpertise(mentor.getExpertise());
        response.setCreatedAt(mentor.getCreatedAt());
        response.setUpdatedAt(mentor.getUpdatedAt());
        return response;
    }
}

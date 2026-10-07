package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.MentorProfileRequest;
import com.agenticai.interviewrepo.dto.MentorProfileResponse;
import com.agenticai.interviewrepo.model.Mentor;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.MentorRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MentorService {

    private final MentorRepository mentorRepository;
    private final CurrentUserService currentUserService;

    public MentorService(
            MentorRepository mentorRepository,
            CurrentUserService currentUserService
    ) {
        this.mentorRepository = mentorRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public MentorProfileResponse getMyProfile() {

        User user = currentUserService.getCurrentUser();

        Mentor mentor = mentorRepository.findByLogin(user)
                .orElseThrow(() ->
                        new IllegalStateException("Mentor profile not found")
                );

        return toResponse(mentor);
    }

    @Transactional
    public MentorProfileResponse updateMyProfile(
            MentorProfileRequest request
    ) {

        User user = currentUserService.getCurrentUser();

        if (user.getRole() != Role.MENTOR &&
                user.getRole() != Role.ADMIN) {

            throw new AccessDeniedException(
                    "Only mentors or administrators can modify mentor profiles"
            );
        }

        Mentor mentor = mentorRepository.findByLogin(user)
                .orElseThrow(() ->
                        new IllegalStateException("Mentor profile not found")
                );

        if (request.getName() != null) {
            mentor.setName(request.getName());
        }

        if (request.getBio() != null) {
            mentor.setBio(request.getBio());
        }

        if (request.getExpertise() != null) {
            mentor.setExpertise(request.getExpertise());
        }

        return toResponse(
                mentorRepository.save(mentor)
        );
    }

    private MentorProfileResponse toResponse(Mentor mentor) {

        MentorProfileResponse response =
                new MentorProfileResponse();

        response.setId(mentor.getId());
        response.setName(mentor.getName());

        if (mentor.getLogin() != null) {
            response.setEmail(
                    mentor.getLogin().getEmail()
            );
        }

        response.setBio(mentor.getBio());
        response.setExpertise(mentor.getExpertise());

        response.setCreatedAt(mentor.getCreatedAt());
        response.setUpdatedAt(mentor.getUpdatedAt());

        return response;
    }
}
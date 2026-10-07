package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.AlumniProfileRequest;
import com.agenticai.interviewrepo.dto.AlumniProfileResponse;
import com.agenticai.interviewrepo.model.PlacedAlumni;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.AlumniRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AlumniService {

    private final AlumniRepository alumniRepository;
    private final CurrentUserService currentUserService;
    private final ProvisioningHelper provisioning;

    public AlumniService(
            AlumniRepository alumniRepository,
            CurrentUserService currentUserService,
            ProvisioningHelper provisioning
    ) {
        this.alumniRepository = alumniRepository;
        this.currentUserService = currentUserService;
        this.provisioning = provisioning;
    }

    /**
     * The current user's alumni profile. An ALUMNI account without a profile row gets one on
     * first use (race-safe); other roles without one get a clear 403 instead of a 500.
     */
    private PlacedAlumni currentAlumni(User user) {
        if (user.getRole() != Role.ALUMNI)
            return alumniRepository.findByLogin(user).orElseThrow(() ->
                    new org.springframework.web.server.ResponseStatusException(
                            org.springframework.http.HttpStatus.FORBIDDEN, "Only alumni have an alumni profile"));
        return provisioning.getOrCreate(() -> alumniRepository.findByLogin(user), () -> {
            PlacedAlumni alumni = new PlacedAlumni();
            alumni.setLogin(user);
            alumni.setName(MentorService.displayName(user));
            return alumniRepository.save(alumni);
        });
    }

    @Transactional(readOnly = true)
    public AlumniProfileResponse getMyProfile() {

        User user = currentUserService.getCurrentUser();

        PlacedAlumni alumni = currentAlumni(user);

        return toResponse(alumni);
    }

    @Transactional
    public AlumniProfileResponse updateMyProfile(
            AlumniProfileRequest request
    ) {

        User user = currentUserService.getCurrentUser();

        if (user.getRole() != Role.ALUMNI &&
                user.getRole() != Role.ADMIN) {

            throw new AccessDeniedException(
                    "Only alumni or administrators can modify alumni profiles"
            );
        }

        PlacedAlumni alumni=currentAlumni(user);

        if (request.getName() != null) {
            alumni.setName(request.getName());
        }

        if (request.getPosition() != null) {
            alumni.setPosition(request.getPosition());
        }

        if (request.getGraduationYear() != null) {
            alumni.setGraduationYear(
                    request.getGraduationYear()
            );
        }

        if (request.getExperienceYears() != null) {
            alumni.setExperienceYears(
                    request.getExperienceYears()
            );
        }

        if (request.getLinkedinUrl() != null) {
            alumni.setLinkedinUrl(
                    request.getLinkedinUrl()
            );
        }

        if (request.getAdvice() != null) {
            alumni.setAdvice(
                    request.getAdvice()
            );
        }

        return toResponse(
                alumniRepository.save(alumni)
        );
    }

    private AlumniProfileResponse toResponse(
            PlacedAlumni alumni
    ) {

        AlumniProfileResponse response =
                new AlumniProfileResponse();

        response.setId(alumni.getId());
        response.setName(alumni.getName());

        if (alumni.getLogin() != null) {
            response.setEmail(
                    alumni.getLogin().getEmail()
            );
        }

        if (alumni.getCompany() != null) {
            response.setCompanyId(
                    alumni.getCompany().getId()
            );
        }

        response.setPosition(alumni.getPosition());
        response.setGraduationYear(
                alumni.getGraduationYear()
        );
        response.setExperienceYears(
                alumni.getExperienceYears()
        );
        response.setLinkedinUrl(
                alumni.getLinkedinUrl()
        );
        response.setAdvice(
                alumni.getAdvice()
        );

        response.setCreatedAt(alumni.getCreatedAt());
        response.setUpdatedAt(alumni.getUpdatedAt());

        return response;
    }
}
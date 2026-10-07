package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.StudentProfileRequest;
import com.agenticai.interviewrepo.dto.StudentProfileResponse;
import com.agenticai.interviewrepo.model.Student;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.StudentRepository;
import com.agenticai.interviewrepo.model.Role;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.AccessDeniedException;

@Service
public class StudentService {
    private final StudentRepository studentRepository;
    private final CurrentUserService currentUserService;

    StudentService(StudentRepository studentRepository, CurrentUserService currentUserService) {
        this.studentRepository=studentRepository;
        this.currentUserService=currentUserService;
    }

    @Transactional
    public StudentProfileResponse getMyProfile() {
        User user=currentUserService.getCurrentUser();

        Student student=studentRepository.findByLogin(user).orElseThrow(() -> new IllegalStateException("Student Profile Not Found"));

        return toResponse(student);
    }

    @Transactional
    public StudentProfileResponse updateMyProfile(StudentProfileRequest request) throws AccessDeniedException {
        User user=currentUserService.getCurrentUser();

        if (user.getRole()!=Role.STUDENT && user.getRole()!=Role.ADMIN) {
            throw new AccessDeniedException("Only the user and the administrator can update the profile");
        }

        Student student=studentRepository.findByLogin(user).orElseThrow(()->new IllegalStateException("Student Profile is not found"));

        if (request.getBio()!=null) {
            student.setBio(request.getBio());
        }

        if (request.getCollege()!=null) {
            student.setCollege(request.getCollege());
        }

        if (request.getDegree()!=null) {
            student.setDegree(request.getDegree());
        }

        if (request.getGithubURL()!=null) {
            student.setGithubUrl(request.getGithubURL());
        }

        if (request.getGraduationYear()!=null) {
            student.setGraduationYear(request.getGraduationYear());
        }

        if (request.getLinkedinURL()!=null) {
            student.setLinkedinUrl(request.getLinkedinURL());
        }

        if (request.getName()!=null) {
            student.setName(request.getName());
        }

        if (request.getPhone()!=null) {
            student.setPhone(request.getPhone());
        }

        if (request.getResumeURL()!=null) {
            student.setResumeUrl(request.getResumeURL());
        }

        if (request.getSkills()!=null) {
            student.setSkills(request.getSkills());
        }

        Student saved=studentRepository.save(student);
        return toResponse(saved);
    }

    private StudentProfileResponse toResponse(Student student) {
        StudentProfileResponse response=new StudentProfileResponse();

        response.setId(response.getId());
        response.setName(response.getName());

        if (student.getLogin()!=null) {
            response.setEmail(student.getLogin().getEmail());
        }

        response.setPhone(student.getPhone());
        response.setCollege(student.getCollege());
        response.setDegree(student.getDegree());
        response.setGraduationYear(student.getGraduationYear());
        response.setLinkedinURL(student.getLinkedinUrl());
        response.setResumeURL(student.getResumeUrl());
        response.setGithubURL(student.getGithubUrl());
        response.setSkills(student.getSkills());
        response.setBio(student.getBio());

        if (student.getMentor() != null) {
            response.setMentorID(student.getMentor().getId());
        }

        response.setCreatedAt(student.getCreatedAt());
        response.setUpdatedAt(student.getUpdatedAt());

        return response;
    }
}
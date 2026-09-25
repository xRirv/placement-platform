package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.StudentProfileRequest;
import com.agenticai.interviewrepo.dto.StudentProfileResponse;
import com.agenticai.interviewrepo.service.StudentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.AccessDeniedException;

@RestController
@RequestMapping("/api/student")
public class StudentController {
    private final StudentService studentService;

    StudentController(StudentService studentService) {
        this.studentService=studentService;
    }

    @GetMapping("/profile")
    public ResponseEntity<StudentProfileResponse> getProfile() {
        return ResponseEntity.status(HttpStatus.OK).body(studentService.getMyProfile());
    }

    @PutMapping("/profile")
    public ResponseEntity<StudentProfileResponse> updateProfile(@RequestBody StudentProfileRequest request) throws AccessDeniedException {
        return ResponseEntity.ok(studentService.updateMyProfile(request));
    }
}
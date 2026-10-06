package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.*;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final com.agenticai.interviewrepo.service.AdminManagementService adminManagementService;
    private final com.agenticai.interviewrepo.service.BatchUploadService batchUploadService;

    public AdminController(
            AdminService adminService,
            com.agenticai.interviewrepo.service.AdminManagementService adminManagementService,
            com.agenticai.interviewrepo.service.BatchUploadService batchUploadService
    ) {
        this.adminService = adminService;
        this.adminManagementService = adminManagementService;
        this.batchUploadService = batchUploadService;
    }

    // =========================
    // ADMIN PROFILE
    // =========================

    @GetMapping("/profile")
    public ResponseEntity<AdminProfileResponse> getProfile()
            throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.getProfile()
        );
    }

    @PutMapping("/profile")
    public ResponseEntity<AdminProfileResponse> updateProfile(
            @RequestBody AdminProfileRequest request
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.updateProfile(request)
        );
    }

    // =========================
    // USER MANAGEMENT
    // =========================

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) String search
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.getUsers(
                        role,
                        search
                )
        );
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserResponse> getUser(
            @PathVariable UUID id
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.getUser(id)
        );
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<AdminUserResponse> updateRole(
            @PathVariable UUID id,
            @RequestBody AdminRoleUpdateRequest request
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.updateRole(
                        id,
                        request
                )
        );
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<AdminUserResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody AdminUserStatusRequest request
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.updateStatus(
                        id,
                        request
                )
        );
    }

    @PostMapping("/users/{id}/deactivate")
    public ResponseEntity<AdminUserResponse> deactivateUser(
            @PathVariable UUID id
    ) throws AccessDeniedException {

        AdminUserStatusRequest request =
                new AdminUserStatusRequest();

        request.setActive(false);
        request.setReason(
                "Deactivated by administrator"
        );

        return ResponseEntity.ok(
                adminService.updateStatus(
                        id,
                        request
                )
        );
    }

    // =========================
    // MODERATION LOGS
    // =========================

    @GetMapping("/moderation-logs")
    public ResponseEntity<Page<AdminModerationLogResponse>> getModerationLogs(
            Pageable pageable
    ) throws AccessDeniedException {

        return ResponseEntity.ok(
                adminService.getModerationLogs(pageable)
        );
    }

    // ========================================
    // NEW: COMPREHENSIVE MANAGEMENT ENDPOINTS
    // ========================================

    // ==== STUDENT MANAGEMENT ====

    // TEST ENDPOINT - Without Supabase Auth (for testing only)
    @PostMapping("/management/students/test")
    public ResponseEntity<String> createStudentTest(
            @RequestBody com.agenticai.interviewrepo.dto.AdminStudentCreateRequest request
    ) {
        try {
            // Create user in database only (skip Supabase Auth)
            com.agenticai.interviewrepo.model.User user = new com.agenticai.interviewrepo.model.User();
            user.setEmail(request.getEmail());
            user.setName(request.getName());
            user.setRole(com.agenticai.interviewrepo.model.Role.STUDENT);
            user.setActive(true);
            user = com.agenticai.interviewrepo.repository.UserRepository.class.cast(
                adminManagementService.getClass().getDeclaredField("userRepository").get(adminManagementService)
            ).save(user);

            // Create student profile
            com.agenticai.interviewrepo.model.Student student = new com.agenticai.interviewrepo.model.Student();
            student.setLogin(user);
            student.setName(request.getName());
            student.setRollNumber(request.getRollNumber());
            student.setPhone(request.getPhone());
            student.setCollege(request.getCollege());
            student.setDegree(request.getDegree());
            student.setGraduationYear(request.getGraduationYear());
            student.setSkills(request.getSkills());
            student.setBio(request.getBio());

            com.agenticai.interviewrepo.repository.StudentRepository studentRepo =
                com.agenticai.interviewrepo.repository.StudentRepository.class.cast(
                    adminManagementService.getClass().getDeclaredField("studentRepository").get(adminManagementService)
                );
            student = studentRepo.save(student);

            return ResponseEntity.ok("SUCCESS: Student created without Supabase Auth. ID=" + student.getId() +
                ", Name=" + student.getName() + ", Email=" + user.getEmail() + ", College=" + student.getCollege());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("ERROR: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
    }

    @PostMapping("/management/students")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminStudentDetailResponse> createStudent(
            @RequestBody @org.springframework.validation.annotation.Validated com.agenticai.interviewrepo.dto.AdminStudentCreateRequest request
    ) {
        return ResponseEntity.ok(adminManagementService.createStudent(request));
    }

    @GetMapping("/management/students")
    public ResponseEntity<org.springframework.data.domain.Page<com.agenticai.interviewrepo.dto.AdminStudentDetailResponse>> getAllStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            org.springframework.data.domain.Pageable pageable
    ) {
        return ResponseEntity.ok(adminManagementService.getAllStudents(search, isActive, pageable));
    }

    @GetMapping("/management/students/{id}")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminStudentDetailResponse> getStudent(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(adminManagementService.getStudent(id));
    }

    @PutMapping("/management/students/{id}")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminStudentDetailResponse> updateStudent(
            @PathVariable UUID id,
            @RequestBody com.agenticai.interviewrepo.dto.AdminStudentUpdateRequest request
    ) {
        return ResponseEntity.ok(adminManagementService.updateStudent(id, request));
    }

    @DeleteMapping("/management/students/{id}")
    public ResponseEntity<Void> deleteStudent(@PathVariable UUID id) {
        adminManagementService.deleteStudent(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/management/students/{id}/assign-mentor/{mentorId}")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminStudentDetailResponse> assignMentor(
            @PathVariable UUID id,
            @PathVariable UUID mentorId
    ) {
        return ResponseEntity.ok(adminManagementService.assignMentor(id, mentorId));
    }

    @DeleteMapping("/management/students/{id}/unassign-mentor")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminStudentDetailResponse> unassignMentor(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(adminManagementService.unassignMentor(id));
    }

    @PostMapping("/management/students/batch-upload")
    public ResponseEntity<com.agenticai.interviewrepo.dto.BatchUploadResult> uploadStudentsBatch(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        return ResponseEntity.ok(batchUploadService.uploadStudents(file));
    }

    @GetMapping("/management/students/template")
    public ResponseEntity<byte[]> downloadStudentTemplate() {
        try {
            byte[] template = batchUploadService.generateStudentTemplate();
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=students_template.xlsx")
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(template);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==== MENTOR MANAGEMENT ====
    @PostMapping("/management/mentors")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminMentorDetailResponse> createMentor(
            @RequestBody @org.springframework.validation.annotation.Validated com.agenticai.interviewrepo.dto.AdminMentorCreateRequest request
    ) {
        return ResponseEntity.ok(adminManagementService.createMentor(request));
    }

    @GetMapping("/management/mentors")
    public ResponseEntity<org.springframework.data.domain.Page<com.agenticai.interviewrepo.dto.AdminMentorDetailResponse>> getAllMentors(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            org.springframework.data.domain.Pageable pageable
    ) {
        return ResponseEntity.ok(adminManagementService.getAllMentors(search, isActive, pageable));
    }

    @GetMapping("/management/mentors/{id}")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminMentorDetailResponse> getMentor(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(adminManagementService.getMentor(id));
    }

    @PutMapping("/management/mentors/{id}")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminMentorDetailResponse> updateMentor(
            @PathVariable UUID id,
            @RequestBody com.agenticai.interviewrepo.dto.AdminMentorUpdateRequest request
    ) {
        return ResponseEntity.ok(adminManagementService.updateMentor(id, request));
    }

    @DeleteMapping("/management/mentors/{id}")
    public ResponseEntity<Void> deleteMentor(@PathVariable UUID id) {
        adminManagementService.deleteMentor(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/management/mentors/batch-upload")
    public ResponseEntity<com.agenticai.interviewrepo.dto.BatchUploadResult> uploadMentorsBatch(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        return ResponseEntity.ok(batchUploadService.uploadMentors(file));
    }

    @GetMapping("/management/mentors/template")
    public ResponseEntity<byte[]> downloadMentorTemplate() {
        try {
            byte[] template = batchUploadService.generateMentorTemplate();
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=mentors_template.xlsx")
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(template);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==== ALUMNI MANAGEMENT ====
    @PostMapping("/management/alumni")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminAlumniDetailResponse> createAlumni(
            @RequestBody @org.springframework.validation.annotation.Validated com.agenticai.interviewrepo.dto.AdminAlumniCreateRequest request
    ) {
        return ResponseEntity.ok(adminManagementService.createAlumni(request));
    }

    @GetMapping("/management/alumni")
    public ResponseEntity<org.springframework.data.domain.Page<com.agenticai.interviewrepo.dto.AdminAlumniDetailResponse>> getAllAlumni(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            org.springframework.data.domain.Pageable pageable
    ) {
        return ResponseEntity.ok(adminManagementService.getAllAlumni(search, isActive, pageable));
    }

    @GetMapping("/management/alumni/{id}")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminAlumniDetailResponse> getAlumni(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(adminManagementService.getAlumni(id));
    }

    @PutMapping("/management/alumni/{id}")
    public ResponseEntity<com.agenticai.interviewrepo.dto.AdminAlumniDetailResponse> updateAlumni(
            @PathVariable UUID id,
            @RequestBody com.agenticai.interviewrepo.dto.AdminAlumniUpdateRequest request
    ) {
        return ResponseEntity.ok(adminManagementService.updateAlumni(id, request));
    }

    @DeleteMapping("/management/alumni/{id}")
    public ResponseEntity<Void> deleteAlumni(@PathVariable UUID id) {
        adminManagementService.deleteAlumni(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/management/alumni/batch-upload")
    public ResponseEntity<com.agenticai.interviewrepo.dto.BatchUploadResult> uploadAlumniBatch(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        return ResponseEntity.ok(batchUploadService.uploadAlumni(file));
    }

    @GetMapping("/management/alumni/template")
    public ResponseEntity<byte[]> downloadAlumniTemplate() {
        try {
            byte[] template = batchUploadService.generateAlumniTemplate();
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=alumni_template.xlsx")
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(template);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==== MODERATION LOG MANAGEMENT ====
    @PostMapping("/management/moderation-logs/{id}/review")
    public ResponseEntity<Void> reviewModerationLog(
            @PathVariable UUID id,
            @RequestBody @org.springframework.validation.annotation.Validated com.agenticai.interviewrepo.dto.ModerationReviewRequest request
    ) {
        adminManagementService.reviewModerationLog(id, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/management/moderation-logs")
    public ResponseEntity<org.springframework.data.domain.Page<AdminModerationLogResponse>> getManagementModerationLogs(
            @RequestParam(required = false) String status,
            org.springframework.data.domain.Pageable pageable
    ) {
        return ResponseEntity.ok(adminManagementService.getModerationLogs(status, pageable));
    }

    // ==== ADMIN CREATION ====
    @PostMapping("/management/admins")
    public ResponseEntity<AdminProfileResponse> createAdminUser(
            @RequestBody @org.springframework.validation.annotation.Validated AdminUserCreateRequest request
    ) {
        return ResponseEntity.ok(adminManagementService.createAdmin(request));
    }

    // ==== EXPERIENCE FETCHING ====
    @GetMapping("/management/students/{id}/experiences")
    public ResponseEntity<org.springframework.data.domain.Page<com.agenticai.interviewrepo.dto.InterviewExperienceResponse>> getStudentExperiences(
            @PathVariable UUID id,
            org.springframework.data.domain.Pageable pageable
    ) {
        return ResponseEntity.ok(adminManagementService.getStudentExperiences(id, pageable));
    }

    @GetMapping("/management/alumni/{id}/experiences")
    public ResponseEntity<org.springframework.data.domain.Page<com.agenticai.interviewrepo.dto.InterviewExperienceResponse>> getAlumniExperiences(
            @PathVariable UUID id,
            org.springframework.data.domain.Pageable pageable
    ) {
        return ResponseEntity.ok(adminManagementService.getAlumniExperiences(id, pageable));
    }
}
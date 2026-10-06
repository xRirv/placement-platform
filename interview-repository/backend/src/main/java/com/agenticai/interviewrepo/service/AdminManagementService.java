package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.*;
import com.agenticai.interviewrepo.model.*;
import com.agenticai.interviewrepo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminManagementService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final MentorRepository mentorRepository;
    private final AlumniRepository alumniRepository;
    private final AdministratorRepository administratorRepository;
    private final ModerationLogRepository moderationLogRepository;
    private final InterviewExperienceRepository interviewExperienceRepository;
    private final ApplicationRepository applicationRepository;
    private final CompanyRepository companyRepository;
    private final SupabaseAdminService supabaseAdminService;

    // ==================== STUDENT MANAGEMENT ====================

    @Transactional
    public AdminStudentDetailResponse createStudent(AdminStudentCreateRequest request) {
        // Auto-generate password if not provided
        String password = request.getPassword();
        if (password == null || password.trim().isEmpty()) {
            password = generatePassword();
        }

        // Create auth user in Supabase
        var authResult = supabaseAdminService.createUser(
                request.getEmail(),
                password,
                request.getName(),
                Role.STUDENT
        );

        if (authResult.isEmpty()) {
            throw new RuntimeException("Failed to create student authentication");
        }

        // Create User record
        User user = User.builder()
                .id(UUID.randomUUID())
                .authUserId(authResult.get().id())
                .email(request.getEmail())
                .name(request.getName())
                .role(Role.STUDENT)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        // Create Student profile
        Student student = new Student();
        student.setLogin(user);
        student.setName(request.getName());
        student.setRollNumber(request.getRollNumber());
        student.setPhone(request.getPhone());
        student.setCollege(request.getCollege());
        student.setDegree(request.getDegree());
        student.setGraduationYear(request.getGraduationYear());
        student.setResumeUrl(request.getResumeUrl());
        student.setLinkedinUrl(request.getLinkedinUrl());
        student.setGithubUrl(request.getGithubUrl());
        student.setSkills(request.getSkills());
        student.setBio(request.getBio());

        // Assign mentor if provided
        if (request.getMentorId() != null) {
            Mentor mentor = mentorRepository.findById(request.getMentorId())
                    .orElseThrow(() -> new RuntimeException("Mentor not found"));
            student.setMentor(mentor);
        }

        student = studentRepository.save(student);

        // Log the action
        logModerationAction("STUDENT", student.getId(), "CREATE", "Student created by admin");

        AdminStudentDetailResponse response = mapToStudentDetailResponse(student);
        response.setGeneratedPassword(password); // Include generated password in response
        return response;
    }

    @Transactional
    public AdminStudentDetailResponse updateStudent(UUID studentId, AdminStudentUpdateRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (request.getName() != null) student.setName(request.getName());
        if (request.getRollNumber() != null) student.setRollNumber(request.getRollNumber());
        if (request.getPhone() != null) student.setPhone(request.getPhone());
        if (request.getCollege() != null) student.setCollege(request.getCollege());
        if (request.getDegree() != null) student.setDegree(request.getDegree());
        if (request.getGraduationYear() != null) student.setGraduationYear(request.getGraduationYear());
        if (request.getResumeUrl() != null) student.setResumeUrl(request.getResumeUrl());
        if (request.getLinkedinUrl() != null) student.setLinkedinUrl(request.getLinkedinUrl());
        if (request.getGithubUrl() != null) student.setGithubUrl(request.getGithubUrl());
        if (request.getSkills() != null) student.setSkills(request.getSkills());
        if (request.getBio() != null) student.setBio(request.getBio());

        if (request.getMentorId() != null) {
            Mentor mentor = mentorRepository.findById(request.getMentorId())
                    .orElseThrow(() -> new RuntimeException("Mentor not found"));
            student.setMentor(mentor);
        }

        if (request.getIsActive() != null) {
            student.getLogin().setActive(request.getIsActive());
            userRepository.save(student.getLogin());
        }

        student = studentRepository.save(student);

        logModerationAction("STUDENT", student.getId(), "UPDATE", "Student updated by admin");

        return mapToStudentDetailResponse(student);
    }

    @Transactional
    public void deleteStudent(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Delete from Supabase Auth
        if (student.getLogin().getAuthUserId() != null) {
            supabaseAdminService.deleteUser(student.getLogin().getAuthUserId());
        }

        logModerationAction("STUDENT", student.getId(), "DELETE", "Student deleted by admin");

        // Delete student and user
        studentRepository.delete(student);
        userRepository.delete(student.getLogin());
    }

    public AdminStudentDetailResponse getStudent(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        return mapToStudentDetailResponse(student);
    }

    public Page<AdminStudentDetailResponse> getAllStudents(String search, Boolean isActive, Pageable pageable) {
        Page<Student> students;

        if (search != null && !search.isEmpty()) {
            students = studentRepository.findByNameContainingIgnoreCaseOrLogin_EmailContainingIgnoreCase(
                    search, search, pageable);
        } else if (isActive != null) {
            students = studentRepository.findByLogin_IsActive(isActive, pageable);
        } else {
            students = studentRepository.findAll(pageable);
        }

        return students.map(this::mapToStudentDetailResponse);
    }

    @Transactional
    public AdminStudentDetailResponse assignMentor(UUID studentId, UUID mentorId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new RuntimeException("Mentor not found"));

        student.setMentor(mentor);
        student = studentRepository.save(student);

        logModerationAction("STUDENT", student.getId(), "ASSIGN_MENTOR",
                "Assigned mentor: " + mentor.getName());

        return mapToStudentDetailResponse(student);
    }

    @Transactional
    public AdminStudentDetailResponse unassignMentor(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        String mentorName = student.getMentor() != null ? student.getMentor().getName() : "None";
        student.setMentor(null);
        student = studentRepository.save(student);

        logModerationAction("STUDENT", student.getId(), "UNASSIGN_MENTOR",
                "Unassigned mentor: " + mentorName);

        return mapToStudentDetailResponse(student);
    }

    // ==================== MENTOR MANAGEMENT ====================

    @Transactional
    public AdminMentorDetailResponse createMentor(AdminMentorCreateRequest request) {
        // Auto-generate password if not provided
        String password = request.getPassword();
        if (password == null || password.trim().isEmpty()) {
            password = generatePassword();
        }

        var authResult = supabaseAdminService.createUser(
                request.getEmail(),
                password,
                request.getName(),
                Role.MENTOR
        );

        if (authResult.isEmpty()) {
            throw new RuntimeException("Failed to create mentor authentication");
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .authUserId(authResult.get().id())
                .email(request.getEmail())
                .name(request.getName())
                .role(Role.MENTOR)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        Mentor mentor = new Mentor();
        mentor.setLogin(user);
        mentor.setName(request.getName());
        mentor.setFacultyId(request.getFacultyId());
        mentor.setBio(request.getBio());
        mentor.setExpertise(request.getExpertise());

        mentor = mentorRepository.save(mentor);

        logModerationAction("MENTOR", mentor.getId(), "CREATE", "Mentor created by admin");

        AdminMentorDetailResponse response = mapToMentorDetailResponse(mentor);
        response.setGeneratedPassword(password); // Include generated password in response
        return response;
    }

    @Transactional
    public AdminMentorDetailResponse updateMentor(UUID mentorId, AdminMentorUpdateRequest request) {
        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new RuntimeException("Mentor not found"));

        if (request.getName() != null) mentor.setName(request.getName());
        if (request.getFacultyId() != null) mentor.setFacultyId(request.getFacultyId());
        if (request.getBio() != null) mentor.setBio(request.getBio());
        if (request.getExpertise() != null) mentor.setExpertise(request.getExpertise());

        if (request.getIsActive() != null) {
            mentor.getLogin().setActive(request.getIsActive());
            userRepository.save(mentor.getLogin());
        }

        mentor = mentorRepository.save(mentor);

        logModerationAction("MENTOR", mentor.getId(), "UPDATE", "Mentor updated by admin");

        return mapToMentorDetailResponse(mentor);
    }

    @Transactional
    public void deleteMentor(UUID mentorId) {
        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new RuntimeException("Mentor not found"));

        if (mentor.getLogin().getAuthUserId() != null) {
            supabaseAdminService.deleteUser(mentor.getLogin().getAuthUserId());
        }

        logModerationAction("MENTOR", mentor.getId(), "DELETE", "Mentor deleted by admin");

        mentorRepository.delete(mentor);
        userRepository.delete(mentor.getLogin());
    }

    public AdminMentorDetailResponse getMentor(UUID mentorId) {
        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new RuntimeException("Mentor not found"));
        return mapToMentorDetailResponse(mentor);
    }

    public Page<AdminMentorDetailResponse> getAllMentors(String search, Boolean isActive, Pageable pageable) {
        Page<Mentor> mentors;

        if (search != null && !search.isEmpty()) {
            mentors = mentorRepository.findByNameContainingIgnoreCaseOrLogin_EmailContainingIgnoreCase(
                    search, search, pageable);
        } else if (isActive != null) {
            mentors = mentorRepository.findByLogin_IsActive(isActive, pageable);
        } else {
            mentors = mentorRepository.findAll(pageable);
        }

        return mentors.map(this::mapToMentorDetailResponse);
    }

    // ==================== ALUMNI MANAGEMENT ====================

    @Transactional
    public AdminAlumniDetailResponse createAlumni(AdminAlumniCreateRequest request) {
        // Auto-generate password if not provided
        String password = request.getPassword();
        if (password == null || password.trim().isEmpty()) {
            password = generatePassword();
        }

        var authResult = supabaseAdminService.createUser(
                request.getEmail(),
                password,
                request.getName(),
                Role.ALUMNI
        );

        if (authResult.isEmpty()) {
            throw new RuntimeException("Failed to create alumni authentication");
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .authUserId(authResult.get().id())
                .email(request.getEmail())
                .name(request.getName())
                .role(Role.ALUMNI)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        PlacedAlumni alumni = new PlacedAlumni();
        alumni.setLogin(user);
        alumni.setName(request.getName());
        alumni.setRollNumber(request.getRollNumber());

        if (request.getCompanyId() != null) {
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new RuntimeException("Company not found"));
            alumni.setCompany(company);
        }

        alumni.setPosition(request.getPosition());
        alumni.setGraduationYear(request.getGraduationYear());
        alumni.setExperienceYears(request.getExperienceYears());
        alumni.setLinkedinUrl(request.getLinkedinUrl());
        alumni.setAdvice(request.getAdvice());

        alumni = alumniRepository.save(alumni);

        logModerationAction("ALUMNI", alumni.getId(), "CREATE", "Alumni created by admin");

        AdminAlumniDetailResponse response = mapToAlumniDetailResponse(alumni);
        response.setGeneratedPassword(password); // Include generated password in response
        return response;
    }

    @Transactional
    public AdminAlumniDetailResponse updateAlumni(UUID alumniId, AdminAlumniUpdateRequest request) {
        PlacedAlumni alumni = alumniRepository.findById(alumniId)
                .orElseThrow(() -> new RuntimeException("Alumni not found"));

        if (request.getName() != null) alumni.setName(request.getName());
        if (request.getRollNumber() != null) alumni.setRollNumber(request.getRollNumber());

        if (request.getCompanyId() != null) {
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new RuntimeException("Company not found"));
            alumni.setCompany(company);
        }

        if (request.getPosition() != null) alumni.setPosition(request.getPosition());
        if (request.getGraduationYear() != null) alumni.setGraduationYear(request.getGraduationYear());
        if (request.getExperienceYears() != null) alumni.setExperienceYears(request.getExperienceYears());
        if (request.getLinkedinUrl() != null) alumni.setLinkedinUrl(request.getLinkedinUrl());
        if (request.getAdvice() != null) alumni.setAdvice(request.getAdvice());

        if (request.getIsActive() != null) {
            alumni.getLogin().setActive(request.getIsActive());
            userRepository.save(alumni.getLogin());
        }

        alumni = alumniRepository.save(alumni);

        logModerationAction("ALUMNI", alumni.getId(), "UPDATE", "Alumni updated by admin");

        return mapToAlumniDetailResponse(alumni);
    }

    @Transactional
    public void deleteAlumni(UUID alumniId) {
        PlacedAlumni alumni = alumniRepository.findById(alumniId)
                .orElseThrow(() -> new RuntimeException("Alumni not found"));

        if (alumni.getLogin().getAuthUserId() != null) {
            supabaseAdminService.deleteUser(alumni.getLogin().getAuthUserId());
        }

        logModerationAction("ALUMNI", alumni.getId(), "DELETE", "Alumni deleted by admin");

        alumniRepository.delete(alumni);
        userRepository.delete(alumni.getLogin());
    }

    public AdminAlumniDetailResponse getAlumni(UUID alumniId) {
        PlacedAlumni alumni = alumniRepository.findById(alumniId)
                .orElseThrow(() -> new RuntimeException("Alumni not found"));
        return mapToAlumniDetailResponse(alumni);
    }

    public Page<AdminAlumniDetailResponse> getAllAlumni(String search, Boolean isActive, Pageable pageable) {
        Page<PlacedAlumni> alumni;

        if (search != null && !search.isEmpty()) {
            alumni = alumniRepository.findByNameContainingIgnoreCaseOrLogin_EmailContainingIgnoreCase(
                    search, search, pageable);
        } else if (isActive != null) {
            alumni = alumniRepository.findByLogin_IsActive(isActive, pageable);
        } else {
            alumni = alumniRepository.findAll(pageable);
        }

        return alumni.map(this::mapToAlumniDetailResponse);
    }

    // ==================== MODERATION LOG MANAGEMENT ====================

    @Transactional
    public void reviewModerationLog(UUID logId, ModerationReviewRequest request) {
        ModerationLog log = moderationLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Moderation log not found"));

        log.setStatus(request.getStatus());
        log.setNotes(request.getNotes());
        log.setReviewedAt(LocalDateTime.now());

        moderationLogRepository.save(log);
    }

    public Page<AdminModerationLogResponse> getModerationLogs(String status, Pageable pageable) {
        Page<ModerationLog> logs;

        if (status != null && !status.isEmpty()) {
            logs = moderationLogRepository.findByStatus(status, pageable);
        } else {
            logs = moderationLogRepository.findAll(pageable);
        }

        return logs.map(this::mapToModerationLogResponse);
    }

    // ==================== ADMIN CREATION ====================

    @Transactional
    public AdminProfileResponse createAdmin(AdminUserCreateRequest request) {
        var authResult = supabaseAdminService.createUser(
                request.getEmail(),
                request.getPassword(),
                request.getFullName(),
                Role.ADMIN
        );

        if (authResult.isEmpty()) {
            throw new RuntimeException("Failed to create admin authentication");
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .authUserId(authResult.get().id())
                .email(request.getEmail())
                .name(request.getFullName())
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        user = userRepository.save(user);

        Administrator admin = new Administrator();
        admin.setLogin(user);
        admin.setName(request.getFullName());
        admin.setCollege(request.getCollege());
        admin = administratorRepository.save(admin);

        logModerationAction("ADMIN", admin.getId(), "CREATE", "Admin created");

        return mapToAdminProfileResponse(admin);
    }

    // ==================== HELPER METHODS ====================

    private void logModerationAction(String entityType, UUID entityId, String action, String reason) {
        try {
            // getName() returns the auth_user_id (UUID from Supabase), not email
            String authUserId = SecurityContextHolder.getContext().getAuthentication().getName();
            User currentUser = userRepository.findByAuthUserId(authUserId).orElse(null);

            if (currentUser == null) {
                // Log warning but don't fail the operation
                System.err.println("Warning: Could not find current user for moderation log");
                return;
            }

            // Check if user has ADMIN role
            if (currentUser.getRole() != Role.ADMIN) {
                System.err.println("Warning: User " + currentUser.getEmail() + " is not an admin. Skipping moderation log.");
                return;
            }

            // Get or create Administrator profile
            Administrator admin = administratorRepository.findByLogin(currentUser).orElse(null);

            if (admin == null) {
                // Auto-create Administrator profile for admin users
                System.out.println("Creating Administrator profile for admin user: " + currentUser.getEmail());
                admin = new Administrator();
                admin.setLogin(currentUser);
                // Use email prefix if name is null
                String adminName = currentUser.getName();
                if (adminName == null || adminName.trim().isEmpty()) {
                    // Extract name from email (before @)
                    adminName = currentUser.getEmail().split("@")[0];
                    System.out.println("Warning: User name is null, using email prefix: " + adminName);
                }
                admin.setName(adminName);
                admin.setCollege("Default College"); // Default college
                admin = administratorRepository.save(admin);
                System.out.println("Administrator profile created successfully for: " + currentUser.getEmail());
            }

            ModerationLog log = new ModerationLog();
            log.setAdmin(admin);
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setAction(action);
            log.setReason(reason);
            log.setStatus("APPROVED");

            moderationLogRepository.save(log);
        } catch (Exception e) {
            // Log the error but don't fail the main operation
            System.err.println("Warning: Failed to create moderation log: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private AdminStudentDetailResponse mapToStudentDetailResponse(Student student) {
        Long interviewCount = interviewExperienceRepository.countByStudent_Id(student.getId());
        Long applicationCount = applicationRepository.countByStudent_Id(student.getId());

        return AdminStudentDetailResponse.builder()
                .id(student.getId())
                .userId(student.getLogin().getId())
                .name(student.getName())
                .rollNumber(student.getRollNumber())
                .email(student.getLogin().getEmail())
                .phone(student.getPhone())
                .college(student.getCollege())
                .degree(student.getDegree())
                .graduationYear(student.getGraduationYear())
                .resumeUrl(student.getResumeUrl())
                .linkedinUrl(student.getLinkedinUrl())
                .githubUrl(student.getGithubUrl())
                .skills(student.getSkills())
                .bio(student.getBio())
                .isActive(student.getLogin().isActive())
                .mentorId(student.getMentor() != null ? student.getMentor().getId() : null)
                .mentorName(student.getMentor() != null ? student.getMentor().getName() : null)
                .interviewExperiencesCount(interviewCount)
                .applicationCount(applicationCount)
                .createdAt(student.getCreatedAt())
                .updatedAt(student.getUpdatedAt())
                .build();
    }

    private AdminMentorDetailResponse mapToMentorDetailResponse(Mentor mentor) {
        List<Student> students = studentRepository.findByMentor_Id(mentor.getId());

        List<AdminMentorDetailResponse.MentorStudentInfo> studentInfos = students.stream()
                .map(s -> AdminMentorDetailResponse.MentorStudentInfo.builder()
                        .studentId(s.getId())
                        .name(s.getName())
                        .email(s.getLogin().getEmail())
                        .college(s.getCollege())
                        .degree(s.getDegree())
                        .build())
                .collect(Collectors.toList());

        return AdminMentorDetailResponse.builder()
                .id(mentor.getId())
                .userId(mentor.getLogin().getId())
                .name(mentor.getName())
                .facultyId(mentor.getFacultyId())
                .email(mentor.getLogin().getEmail())
                .bio(mentor.getBio())
                .expertise(mentor.getExpertise())
                .isActive(mentor.getLogin().isActive())
                .studentsCount((long) students.size())
                .students(studentInfos)
                .createdAt(mentor.getCreatedAt())
                .updatedAt(mentor.getUpdatedAt())
                .build();
    }

    private AdminAlumniDetailResponse mapToAlumniDetailResponse(PlacedAlumni alumni) {
        Long interviewCount = interviewExperienceRepository.countByAlumni_Id(alumni.getId());

        return AdminAlumniDetailResponse.builder()
                .id(alumni.getId())
                .userId(alumni.getLogin().getId())
                .name(alumni.getName())
                .rollNumber(alumni.getRollNumber())
                .email(alumni.getLogin().getEmail())
                .companyId(alumni.getCompany() != null ? alumni.getCompany().getId() : null)
                .companyName(alumni.getCompany() != null ? alumni.getCompany().getName() : null)
                .position(alumni.getPosition())
                .graduationYear(alumni.getGraduationYear())
                .experienceYears(alumni.getExperienceYears())
                .linkedinUrl(alumni.getLinkedinUrl())
                .advice(alumni.getAdvice())
                .isActive(alumni.getLogin().isActive())
                .interviewExperiencesCount(interviewCount)
                .createdAt(alumni.getCreatedAt())
                .updatedAt(alumni.getUpdatedAt())
                .build();
    }

    private AdminModerationLogResponse mapToModerationLogResponse(ModerationLog log) {
        return AdminModerationLogResponse.builder()
                .id(log.getId())
                .adminName(log.getAdmin().getName())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .action(log.getAction())
                .reason(log.getReason())
                .status(log.getStatus())
                .notes(log.getNotes())
                .reviewedAt(log.getReviewedAt())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private AdminProfileResponse mapToAdminProfileResponse(Administrator admin) {
        return AdminProfileResponse.builder()
                .id(admin.getId())
                .loginId(admin.getLogin().getId())
                .email(admin.getLogin().getEmail())
                .name(admin.getName())
                .role(admin.getLogin().getRole())
                .isActive(admin.getLogin().isActive())
                .createdAt(admin.getCreatedAt())
                .updatedAt(admin.getUpdatedAt())
                .build();
    }

    // Generate secure random password
    private String generatePassword() {
        String upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lowerCase = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String specialChars = "!@#$%^&*";
        String allChars = upperCase + lowerCase + digits + specialChars;

        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder(12);

        // Ensure at least one of each type
        password.append(upperCase.charAt(random.nextInt(upperCase.length())));
        password.append(lowerCase.charAt(random.nextInt(lowerCase.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(specialChars.charAt(random.nextInt(specialChars.length())));

        // Fill the rest randomly
        for (int i = 4; i < 12; i++) {
            password.append(allChars.charAt(random.nextInt(allChars.length())));
        }

        // Shuffle the password
        char[] passwordArray = password.toString().toCharArray();
        for (int i = passwordArray.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = passwordArray[i];
            passwordArray[i] = passwordArray[j];
            passwordArray[j] = temp;
        }

        return new String(passwordArray);
    }

    // ==================== EXPERIENCE FETCHING ====================

    public Page<InterviewExperienceResponse> getStudentExperiences(UUID studentId, Pageable pageable) {
        // Verify student exists
        studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        return interviewExperienceRepository.findByStudent_Id(studentId, pageable)
                .map(InterviewExperienceResponse::from);
    }

    public Page<InterviewExperienceResponse> getAlumniExperiences(UUID alumniId, Pageable pageable) {
        // Verify alumni exists
        alumniRepository.findById(alumniId)
                .orElseThrow(() -> new RuntimeException("Alumni not found"));

        return interviewExperienceRepository.findByAlumni_Id(alumniId, pageable)
                .map(InterviewExperienceResponse::from);
    }
}

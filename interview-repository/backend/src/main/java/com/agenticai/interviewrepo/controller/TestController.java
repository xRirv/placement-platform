package com.agenticai.interviewrepo.controller;

import com.agenticai.interviewrepo.dto.AdminAlumniCreateRequest;
import com.agenticai.interviewrepo.dto.AdminAlumniDetailResponse;
import com.agenticai.interviewrepo.dto.AdminMentorCreateRequest;
import com.agenticai.interviewrepo.dto.AdminMentorDetailResponse;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.Student;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.StudentRepository;
import com.agenticai.interviewrepo.repository.UserRepository;
import com.agenticai.interviewrepo.service.AdminManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/test")
public class TestController {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final AdminManagementService adminManagementService;

    public TestController(UserRepository userRepository, StudentRepository studentRepository, AdminManagementService adminManagementService) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.adminManagementService = adminManagementService;
    }

    @PostMapping("/create-student-no-auth")
    public ResponseEntity<Map<String, Object>> createStudentWithoutAuth(
            @RequestBody Map<String, String> request
    ) {
        Map<String, Object> response = new HashMap<>();

        try {
            // Extract fields
            String name = request.get("name");
            String email = request.get("email");
            String rollNumber = request.get("rollNumber");
            String phone = request.get("phone");
            String college = request.get("college");
            String degree = request.get("degree");
            Integer graduationYear = request.get("graduationYear") != null ?
                Integer.parseInt(request.get("graduationYear")) : null;
            String skills = request.get("skills");

            // Create user in database only (no Supabase)
            User user = new User();
            user.setEmail(email);
            user.setName(name);
            user.setRole(Role.STUDENT);
            user.setActive(true);
            user = userRepository.save(user);

            // Create student profile
            Student student = new Student();
            student.setLogin(user);
            student.setName(name);
            student.setRollNumber(rollNumber);
            student.setPhone(phone);
            student.setCollege(college);
            student.setDegree(degree);
            student.setGraduationYear(graduationYear);
            student.setSkills(skills);
            student = studentRepository.save(student);

            response.put("success", true);
            response.put("message", "Student created successfully WITHOUT Supabase Auth");
            response.put("studentId", student.getId().toString());
            response.put("userId", user.getId().toString());
            response.put("name", student.getName());
            response.put("email", user.getEmail());
            response.put("rollNumber", student.getRollNumber());
            response.put("college", student.getCollege());
            response.put("degree", student.getDegree());
            response.put("graduationYear", student.getGraduationYear());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getClass().getSimpleName());
            response.put("message", e.getMessage());
            response.put("stackTrace", e.toString());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/students")
    public ResponseEntity<Map<String, Object>> getAllStudentsTest() {
        Map<String, Object> response = new HashMap<>();
        try {
            var students = studentRepository.findAll();
            response.put("success", true);
            response.put("count", students.size());
            response.put("students", students);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/create-mentor-full")
    public ResponseEntity<Map<String, Object>> createMentorFullFlow(
            @RequestBody AdminMentorCreateRequest request
    ) {
        Map<String, Object> response = new HashMap<>();

        try {
            System.out.println("=== TEST: Creating mentor via AdminManagementService ===");
            System.out.println("Name: " + request.getName());
            System.out.println("Email: " + request.getEmail());
            System.out.println("Faculty ID: " + request.getFacultyId());

            AdminMentorDetailResponse result = adminManagementService.createMentor(request);

            response.put("success", true);
            response.put("message", "Mentor created successfully with FULL FLOW (Supabase Auth + Database)!");
            response.put("mentor", result);

            System.out.println("✅ TEST SUCCESS: Mentor created with ID: " + result.getId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ TEST FAILED: " + e.getMessage());
            e.printStackTrace();

            response.put("success", false);
            response.put("error", e.getClass().getSimpleName());
            response.put("message", e.getMessage());
            response.put("stackTrace", e.toString());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/create-alumni-full")
    public ResponseEntity<Map<String, Object>> createAlumniFullFlow(
            @RequestBody AdminAlumniCreateRequest request
    ) {
        Map<String, Object> response = new HashMap<>();

        try {
            System.out.println("=== TEST: Creating alumni via AdminManagementService ===");
            System.out.println("Name: " + request.getName());
            System.out.println("Email: " + request.getEmail());

            AdminAlumniDetailResponse result = adminManagementService.createAlumni(request);

            response.put("success", true);
            response.put("message", "Alumni created successfully with FULL FLOW (Supabase Auth + Database)!");
            response.put("alumni", result);

            System.out.println("✅ TEST SUCCESS: Alumni created with ID: " + result.getId());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ TEST FAILED: " + e.getMessage());
            e.printStackTrace();

            response.put("success", false);
            response.put("error", e.getClass().getSimpleName());
            response.put("message", e.getMessage());
            response.put("stackTrace", e.toString());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Test endpoint is working! No authentication required.");
    }
}

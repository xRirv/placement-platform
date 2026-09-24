package com.agenticai.interviewrepo.security;

import com.agenticai.interviewrepo.dto.AdminModerationRequest;
import com.agenticai.interviewrepo.model.ModerationLog;
import com.agenticai.interviewrepo.model.Role;
import com.agenticai.interviewrepo.model.User;
import com.agenticai.interviewrepo.repository.ModerationLogRepository;
import com.agenticai.interviewrepo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Import(SecurityIntegrationTests.TestJwtConfig.class)
public class SecurityIntegrationTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModerationLogRepository moderationLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    private User studentUser;
    private User studentUserB;
    private User adminUser;
    private User mentorUser;
    private User deactivatedUser;

    @TestConfiguration
    public static class TestJwtConfig {

        @Bean
        @Primary
        public JwtDecoder jwtDecoder() {
            return token -> {
                switch (token) {
                    case "token-student":
                        return createMockJwt("sub-student", "student@example.com", "STUDENT");
                    case "token-student-b":
                        return createMockJwt("sub-student-b", "student_b@example.com", "STUDENT");
                    case "token-admin":
                        return createMockJwt("sub-admin", "admin@example.com", "ADMIN");
                    case "token-mentor":
                        return createMockJwt("sub-mentor", "mentor@example.com", "MENTOR");
                    case "token-alumni":
                        return createMockJwt("sub-alumni", "alumni@example.com", "ALUMNI");
                    case "token-deactivated":
                        return createMockJwt("sub-deactivated", "disabled@example.com", "STUDENT");
                    case "token-expired":
                        throw new BadJwtException("Token has expired");
                    case "token-invalid-signature":
                        throw new BadJwtException("Invalid cryptographic signature");
                    case "token-wrong-issuer":
                        throw new BadJwtException("Invalid token issuer: untrusted identity provider");
                    default:
                        throw new BadJwtException("Malformed or unrecognized JWT format");
                }
            };
        }

        private static Jwt createMockJwt(String sub, String email, String role) {
            Instant now = Instant.now();
            return Jwt.withTokenValue("mock-jwt-token")
                    .header("alg", "RS256")
                    .header("typ", "JWT")
                    .claim("sub", sub)
                    .claim("email", email)
                    .claim("role", role)
                    .issuedAt(now)
                    .expiresAt(now.plusSeconds(3600))
                    .issuer("https://test.supabase.co/auth/v1")
                    .build();
        }
    }

    @BeforeEach
    public void setup() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        moderationLogRepository.deleteAll();
        userRepository.deleteAll();

        studentUser = userRepository.save(User.builder()
                .authUserId("sub-student")
                .email("student@example.com")
                .name("Alice Student")
                .role(Role.STUDENT)
                .isActive(true)
                .build());

        studentUserB = userRepository.save(User.builder()
                .authUserId("sub-student-b")
                .email("student_b@example.com")
                .name("Bob Student")
                .role(Role.STUDENT)
                .isActive(true)
                .build());

        adminUser = userRepository.save(User.builder()
                .authUserId("sub-admin")
                .email("admin@example.com")
                .name("Charlie Admin")
                .role(Role.ADMIN)
                .isActive(true)
                .build());

        mentorUser = userRepository.save(User.builder()
                .authUserId("sub-mentor")
                .email("mentor@example.com")
                .name("Dave Mentor")
                .role(Role.MENTOR)
                .isActive(true)
                .build());

        userRepository.save(User.builder()
                .authUserId("sub-alumni")
                .email("alumni@example.com")
                .name("Frank Alumni")
                .role(Role.ALUMNI)
                .isActive(true)
                .build());

        deactivatedUser = userRepository.save(User.builder()
                .authUserId("sub-deactivated")
                .email("disabled@example.com")
                .name("Eve Disabled")
                .role(Role.STUDENT)
                .isActive(false)
                .build());
    }

    // --- TEST A: No Token ---
    @Test
    @DisplayName("Test A: Request to protected endpoint without token returns 401 Unauthorized")
    public void testA_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/student/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", containsString("Full authentication is required")));
    }

    // --- TEST B: Malformed Token ---
    @Test
    @DisplayName("Test B: Request with malformed token returns 401 Unauthorized")
    public void testB_malformedToken_returns401() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer invalid-malformed-string"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")));
    }

    // --- TEST C: Expired Token ---
    @Test
    @DisplayName("Test C: Request with expired token returns 401 Unauthorized")
    public void testC_expiredToken_returns401() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer token-expired"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    // --- TEST D: Invalid Signature ---
    @Test
    @DisplayName("Test D: Request with invalid signature returns 401 Unauthorized")
    public void testD_invalidSignature_returns401() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer token-invalid-signature"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    // --- TEST E: Wrong Issuer ---
    @Test
    @DisplayName("Test E: Request with wrong issuer returns 401 Unauthorized")
    public void testE_wrongIssuer_returns401() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer token-wrong-issuer"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    // --- TEST F & G: Valid Student Token accessing Student Endpoint ---
    @Test
    @DisplayName("Test F & G: Valid student token reaches student endpoint (200 OK)")
    public void testF_testG_studentAccessingStudentEndpoint_returns200() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer token-student"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("student@example.com")))
                .andExpect(jsonPath("$.role", is("STUDENT")))
                .andExpect(jsonPath("$.active", is(true)));
    }

    // --- TEST H: Student Accessing Admin Endpoint ---
    @Test
    @DisplayName("Test H: Student attempting to access admin endpoint returns 403 Forbidden")
    public void testH_studentAccessingAdminEndpoint_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer token-student"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("Access denied")));
    }

    // --- TEST I: Mentor Accessing Admin Endpoint ---
    @Test
    @DisplayName("Test I: Mentor attempting to access admin endpoint returns 403 Forbidden")
    public void testI_mentorAccessingAdminEndpoint_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer token-mentor"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }

    // --- TEST J: Admin Accessing Admin Endpoint ---
    @Test
    @DisplayName("Test J: Admin accessing admin endpoint succeeds (200 OK)")
    public void testJ_adminAccessingAdminEndpoint_returns200() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer token-admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", notNullValue()));
    }

    // --- Mentor Accessing Mentor Endpoint ---
    @Test
    @DisplayName("Mentor accessing mentor endpoint succeeds (200 OK)")
    public void testMentorAccessingMentorEndpoint_returns200() throws Exception {
        mockMvc.perform(get("/api/mentor/profile")
                        .header("Authorization", "Bearer token-mentor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("MENTOR")));
    }

    // --- Student Accessing Mentor Endpoint ---
    @Test
    @DisplayName("Student accessing mentor endpoint returns 403 Forbidden")
    public void testStudentAccessingMentorEndpoint_returns403() throws Exception {
        mockMvc.perform(get("/api/mentor/profile")
                        .header("Authorization", "Bearer token-student"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }

    // --- Alumni Accessing Alumni Endpoint ---
    @Test
    @DisplayName("Alumni accessing alumni endpoint succeeds (200 OK)")
    public void testAlumniAccessingAlumniEndpoint_returns200() throws Exception {
        mockMvc.perform(get("/api/alumni/profile")
                        .header("Authorization", "Bearer token-alumni"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("ALUMNI")));
    }

    // --- Student Accessing Alumni Endpoint ---
    @Test
    @DisplayName("Student accessing alumni endpoint returns 403 Forbidden")
    public void testStudentAccessingAlumniEndpoint_returns403() throws Exception {
        mockMvc.perform(get("/api/alumni/profile")
                        .header("Authorization", "Bearer token-student"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }

    // --- TEST K: Disabled / Deactivated User Token ---
    @Test
    @DisplayName("Test K: Deactivated account request is rejected with 403 Forbidden")
    public void testK_deactivatedUser_returns403() throws Exception {
        mockMvc.perform(get("/api/student/profile")
                        .header("Authorization", "Bearer token-deactivated"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("Account has been deactivated")));
    }

    // --- TEST L: User A requesting User B's private resource (IDOR protection) ---
    @Test
    @DisplayName("Test L: User A requesting User B's private resource is denied with 403 Forbidden (IDOR)")
    public void testL_userARequestingUserBPrivateResource_returns403() throws Exception {
        mockMvc.perform(get("/api/student/" + studentUserB.getId() + "/private")
                        .header("Authorization", "Bearer token-student"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")));

        // Conversely, User B accessing their own private resource succeeds
        mockMvc.perform(get("/api/student/" + studentUserB.getId() + "/private")
                        .header("Authorization", "Bearer token-student-b"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("student_b@example.com")));
    }

    // --- TEST M: Admin Moderation Action ---
    @Test
    @DisplayName("Test M: Admin moderation action succeeds and creates audit log")
    public void testM_adminModerationAction_createsAuditLog() throws Exception {
        AdminModerationRequest request = AdminModerationRequest.builder()
                .entityType("INTERVIEW_EXPERIENCE")
                .entityId(UUID.randomUUID())
                .action("REJECT")
                .reason("Contains inappropriate content violating guidelines")
                .build();

        mockMvc.perform(post("/api/admin/moderate")
                        .header("Authorization", "Bearer token-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action", is("REJECT")))
                .andExpect(jsonPath("$.adminId", is(adminUser.getId().toString())));

        List<ModerationLog> logs = moderationLogRepository.findAll();
        assertThat(logs).hasSize(1);
        ModerationLog log = logs.get(0);
        assertThat(log.getAdminId()).isEqualTo(adminUser.getId());
        assertThat(log.getAction()).isEqualTo("REJECT");
        assertThat(log.getReason()).isEqualTo("Contains inappropriate content violating guidelines");

        // Non-admin attempting moderation must be rejected
        mockMvc.perform(post("/api/admin/moderate")
                        .header("Authorization", "Bearer token-student")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // --- TEST N: Public Endpoint Without Token ---
    @Test
    @DisplayName("Test N: Public health endpoint is accessible without any token")
    public void testN_publicEndpointWithoutToken_returns200() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")));
    }

    // --- TEST O: Sensitive Fields Not Serialized ---
    @Test
    @DisplayName("Test O: API profile responses do not serialize password hashes or secrets")
    public void testO_sensitiveFieldsNotSerialized() throws Exception {
        String responseContent = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer token-student"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(responseContent).doesNotContain("password");
        assertThat(responseContent).doesNotContain("password_hash");
        assertThat(responseContent).doesNotContain("secret");
        assertThat(responseContent).doesNotContain("token");
    }
}

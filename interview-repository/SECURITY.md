# Security Architecture & Authentication Module Documentation
**Project**: Interview Repository Backend  
**Framework**: Spring Boot 4 + Spring Security OAuth2 Resource Server + Supabase Auth + PostgreSQL  

---

## 1. Overview & Architectural Principle

The application enforces a **stateless, zero-trust backend security model** delegating identity verification and password management entirely to **Supabase Auth**, while Spring Boot acts as a secure **OAuth2 Resource Server** validating signed JSON Web Tokens (JWTs) and enforcing application-level Role-Based Access Control (RBAC), account active-status verification, IDOR prevention, and audit logging.

### Fundamental Security Rules
1. **Single Source of Truth for Credentials**: Spring Boot never stores, handles, or checks user passwords. Supabase Auth manages sign-up, login, password hashes, multi-factor authentication, and session refresh lifecycles.
2. **Standardized Cryptography**: No custom JWT decoding or manual crypto algorithms. Spring Security's native OAuth2 Resource Server handles signature verification, token expiration, and issuer validation against Supabase's public JSON Web Key Set (JWKS).
3. **No Frontend Role Trust**: Client-supplied role claims (e.g., `role=ADMIN` in request body or headers) are rejected. Authorities are resolved securely by the backend from the authenticated user's record in the application database (`app_users`).
4. **No Sensitive Data Leakage**: User entities and API responses use dedicated Data Transfer Objects (DTOs) preventing password hashes, session tokens, or internal secrets from ever being serialized or logged.

---

## 2. End-to-End Authentication & Authorization Pipeline

```
┌──────────────┐
│     USER     │
└──────┬───────┘
       │ 1. Submits email + password (HTTPS)
       ▼
┌─────────────────────────────────┐
│          SUPABASE AUTH          │
│ - Verifies credentials          │
│ - Signs JWT with asymmetric key │ (RS256 / ES256)
└──────┬──────────────────────────┘
       │ 2. Returns session { access_token (JWT) }
       ▼
┌──────────────┐
│   FRONTEND   │
└──────┬───────┘
       │ 3. API Request with Header:
       │    Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
       ▼
┌──────────────────────────────────────────────────────────────┐
│                  SPRING BOOT RESOURCE SERVER                 │
│                                                              │
│  BearerTokenAuthenticationFilter                             │
│    │                                                         │
│    ▼ (Extracts Bearer token)                                 │
│  NimbusJwtDecoder                                            │
│    │                                                         │
│    ├─► Fetches public key from Supabase JWKS:                │
│    │   https://<project-ref>.supabase.co/auth/v1/            │
│    │   .well-known/jwks.json                                 │
│    ├─► Validates cryptographic signature                     │
│    ├─► Validates issuer (`iss`) and expiration (`exp`)       │
│    ▼                                                         │
│  JwtAuthConverter                                            │
│    │                                                         │
│    ├─► Extracts `sub` claim (Supabase User UUID)             │
│    ├─► Resolves application user from `app_users` table      │
│    └─► Binds `ROLE_<ROLE>` authority (STUDENT, ADMIN, etc.)  │
│    ▼                                                         │
│  AccountStatusFilter                                         │
│    │                                                         │
│    ├─► Verifies `user.isActive == true`                      │
│    └─► If inactive: Clears context & returns 403 Forbidden   │
│    ▼                                                         │
│  SecurityContextHolder                                       │
│    │ Holds authenticated JwtAuthenticationToken              │
│    ▼                                                         │
│  Controller & Service Layers                                 │
│    ├─► RBAC checks (@PreAuthorize / requestMatchers)         │
│    ├─► Object-level ownership validation (IDOR protection)   │
│    └─► Sensitive admin actions -> written to MODERATION_LOG  │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. JWT Transport & Validation Mechanics

### Transport
- Protected endpoints require the HTTP `Authorization` header:
  ```http
  Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- No query parameters, cookie fallbacks, or custom headers are permitted for token transmission.
- Raw tokens and authorization headers are never logged.

### Validation Parameters
Spring Security validates:
- **`kid` & Signature**: Dynamically resolves the key ID (`kid`) from the JWT header against keys published at Supabase's `.well-known/jwks.json`.
- **`iss` (Issuer)**: Must match `https://<project-ref>.supabase.co/auth/v1`.
- **`exp` (Expiration)**: Tokens past their expiration timestamp are rejected with `401 Unauthorized`.
- **`nbf` (Not Before)**: Tokens evaluated before their validity window are rejected.

---

## 4. Role-Based Access Control (RBAC) & Authority Mapping

The application defines four distinct roles in `Role.java`:
- `STUDENT`: Regular candidate accessing study materials, mock interviews, and personal profile.
- `MENTOR`: Interviewer conducting reviews, evaluating answers, and mentoring students.
- `ALUMNI`: Placed candidate contributing experiences and advice.
- `ADMIN`: Administrator managing users, moderating flagged content, and viewing audit logs.

### Authority Resolution (`JwtAuthConverter`)
1. Upon signature verification, `JwtAuthConverter` extracts the `sub` claim (Supabase user UUID).
2. It queries `UserRepository.findByAuthUserId(sub)`.
3. If an account exists, authorities are mapped directly from `user.getRole()`:
   - `ROLE_STUDENT` and `STUDENT`
   - `ROLE_MENTOR` and `MENTOR`
   - `ROLE_ALUMNI` and `ALUMNI`
   - `ROLE_ADMIN` and `ADMIN`
4. If a user record does not exist in `app_users` yet, fallback checks inspect custom token claims or default to `ROLE_STUDENT`.

---

## 5. Account Active / Deactivation Enforcement

- The `app_users` table tracks account status using the `is_active` boolean column (`User.isActive`).
- **`AccountStatusFilter`**:
  - Executes immediately after bearer token validation.
  - Queries `UserRepository` for the current user's active status.
  - If `isActive == false`:
    - The `SecurityContext` is immediately cleared.
    - The request is halted and returns `HTTP 403 Forbidden` with:
      ```json
      {
        "timestamp": "2026-09-23T23:42:50",
        "status": 403,
        "error": "Forbidden",
        "message": "Account has been deactivated. Please contact an administrator.",
        "path": "/api/student/profile"
      }
      ```
- **JWT Lifespan Consideration**: Changing `is_active = false` immediately halts API access on the Spring Boot backend even if the Supabase-issued JWT has not yet expired.

---

## 6. Object-Level Authorization & IDOR Protection

Insecure Direct Object Reference (IDOR) vulnerabilities occur when endpoints accept arbitrary user IDs and fail to verify caller ownership.

In `CurrentUserService`:
```java
public void assertOwnerOrAdmin(UUID targetUserId) {
    User currentUser = getCurrentUser();
    if (currentUser.getRole() == Role.ADMIN) {
        return; // Admins are granted elevated access
    }
    if (targetUserId == null || !currentUser.getId().equals(targetUserId)) {
        throw new AccessDeniedException("Access denied: You do not have permission to access or modify this resource");
    }
}
```
Any endpoint exposing user-specific data (e.g. `GET /api/student/{studentId}/private`) enforces this check.

---

## 7. Administrative Moderation & Audit Logging

Sensitive administrative actions (such as deactivating a user, moderating an interview experience, or rejecting a question) must produce an immutable audit trail.

### Entity: `ModerationLog`
- `id`: UUID (Primary Key)
- `admin_id`: UUID (Foreign Key pointing to `app_users.id` of the authenticated admin)
- `entity_type`: String (e.g., `USER`, `INTERVIEW_EXPERIENCE`, `QUESTION`)
- `entity_id`: UUID
- `action`: String (e.g., `DEACTIVATE`, `REJECT`, `APPROVE`)
- `reason`: Text explanation
- `created_at`: Timestamp

The admin's identity is derived strictly from `SecurityContextHolder` (never from user input in the request body).

---

## 8. Endpoint Authorization Matrix

| Endpoint | Method | Authentication | Required Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | None | Public | Health check / liveness probe |
| `/api/auth/me` | `GET` | Required | Any Authenticated | Current user profile details |
| `/api/auth/sync` | `POST` | Required | Any Authenticated | Sync Supabase account to local DB |
| `/swagger-ui/**`, `/v3/api-docs/**` | `GET` | None | Public | API Documentation |
| `/api/student/**` | `GET`, `POST`, `PUT` | Required | `STUDENT`, `ADMIN` | Student learning and profile APIs |
| `/api/student/{id}/private`| `GET` | Required | Owner or `ADMIN` | IDOR-protected student private data |
| `/api/mentor/**` | `GET`, `POST`, `PUT` | Required | `MENTOR`, `ADMIN` | Mentor guidance and reviews |
| `/api/alumni/**` | `GET`, `POST`, `PUT` | Required | `ALUMNI`, `ADMIN` | Alumni interview submissions |
| `/api/admin/users` | `GET` | Required | `ADMIN` | List all user accounts |
| `/api/admin/users/{id}/deactivate` | `POST` | Required | `ADMIN` | Deactivate account + write audit log |
| `/api/admin/moderate` | `POST` | Required | `ADMIN` | Moderate content + write audit log |
| `/api/admin/moderation-logs` | `GET` | Required | `ADMIN` | View audit logs |

---

## 9. Error Handling Contract

Errors return consistent JSON payloads without leaking internal cryptographic keys or stack traces:

### 401 Unauthorized
Triggered when no token is supplied, the token is malformed, expired, has an invalid signature, or is issued by an untrusted provider.
```json
{
  "timestamp": "2026-09-23T23:42:50",
  "status": 401,
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource",
  "path": "/api/student/profile"
}
```

### 403 Forbidden
Triggered when a valid token is provided but the user lacks the required role, the account is deactivated, or the user attempts an unauthorized IDOR access.
```json
{
  "timestamp": "2026-09-23T23:42:50",
  "status": 403,
  "error": "Forbidden",
  "message": "Access denied: insufficient permissions or inactive account",
  "path": "/api/admin/users"
}
```

---

## 10. CORS & CSRF Strategy

### Cross-Origin Resource Sharing (CORS)
- Externalized via `app.cors.allowed-origins` (default: `http://localhost:5173,http://localhost:3000`).
- Strict HTTP methods allowed: `GET, POST, PUT, DELETE, PATCH, OPTIONS`.
- Wildcard `allowedOrigins("*")` is **strictly forbidden** when `allowCredentials(true)` is enabled.

### Cross-Site Request Forgery (CSRF)
- CSRF protection is disabled because the API is purely stateless and relies on the standard HTTP `Authorization: Bearer <token>` header.
- Browsers do not automatically attach the `Authorization` header on cross-site requests (unlike ambient credentials like session cookies), preventing standard CSRF vulnerabilities.

---

## 11. Environment Variables & Secret Management

| Variable Name | Description | Example / Default |
| :--- | :--- | :--- |
| `SUPABASE_ISSUER_URI` | Supabase Auth issuer URL | `https://<ref>.supabase.co/auth/v1` |
| `SUPABASE_JWK_SET_URI` | Public JWKS endpoint | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SPRING_DATASOURCE_URL` | PostgreSQL connection JDBC URL | `jdbc:postgresql://localhost:5432/interviewrepo` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `<your-db-password>` |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | Hibernate schema management | `update` (or `validate` in production) |
| `FRONTEND_URL` | Comma-separated CORS allowed origins | `http://localhost:5173,http://localhost:3000` |

---

## 12. Security Test Matrix & Verification

Automated tests in `SecurityIntegrationTests.java` verify the following matrix:

| Test Case | Request | Token | Role | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **Test A** | `GET /api/student/profile` | None | None | `401 Unauthorized` |
| **Test B** | `GET /api/student/profile` | Malformed | None | `401 Unauthorized` |
| **Test C** | `GET /api/student/profile` | Expired | Any | `401 Unauthorized` |
| **Test D** | `GET /api/student/profile` | Invalid Signature | Any | `401 Unauthorized` |
| **Test E** | `GET /api/student/profile` | Wrong Issuer | Any | `401 Unauthorized` |
| **Test F/G** | `GET /api/student/profile` | Valid | `STUDENT` | `200 OK` |
| **Test H** | `GET /api/admin/users` | Valid | `STUDENT` | `403 Forbidden` |
| **Test I** | `GET /api/admin/users` | Valid | `MENTOR` | `403 Forbidden` |
| **Test J** | `GET /api/admin/users` | Valid | `ADMIN` | `200 OK` |
| **Mentor RBAC** | `GET /api/mentor/profile` | Valid | `MENTOR` | `200 OK` |
| **Mentor RBAC** | `GET /api/mentor/profile` | Valid | `STUDENT` | `403 Forbidden` |
| **Alumni RBAC** | `GET /api/alumni/profile` | Valid | `ALUMNI` | `200 OK` |
| **Alumni RBAC** | `GET /api/alumni/profile` | Valid | `STUDENT` | `403 Forbidden` |
| **Test K** | `GET /api/student/profile` | Valid | Inactive User | `403 Forbidden` |
| **Test L** | `GET /api/student/{B}/private`| Valid | User A (`STUDENT`) | `403 Forbidden` (IDOR blocked) |
| **Test L (Owner)** | `GET /api/student/{B}/private`| Valid | User B (`STUDENT`) | `200 OK` |
| **Test M** | `POST /api/admin/moderate` | Valid | `ADMIN` | `200 OK` + `ModerationLog` created |
| **Test M (Non-Admin)** | `POST /api/admin/moderate` | Valid | `STUDENT` | `403 Forbidden` |
| **Test N** | `GET /health` | None | None | `200 OK` |
| **Test O** | `GET /api/auth/me` | Valid | Any | Verified no `password` or secrets serialized |

To run the complete test suite:
```bash
cd backend
sh mvnw test
```

---

## 13. Architectural Decision: Why a Custom `JwtFilter` Was Not Used

Spring Security 6+ / 7+ (Spring Boot 3/4) natively provides `BearerTokenAuthenticationFilter` and `NimbusJwtDecoder` as part of `spring-boot-starter-security-oauth2-resource-server`.
- **Elimination of Boilerplate**: A custom filter copying header extraction, signature verification, and security context population introduces maintenance overhead and security risks.
- **Standards Compliance**: Delegating to Spring Security's native OAuth2 Resource Server guarantees RFC 6750 bearer token compliance, standard HTTP challenge headers (`WWW-Authenticate`), and seamless integration with JWKS key rotation.
- **Clean Extension**: Custom application logic is decoupled into focused components:
  - `JwtAuthConverter`: Transforms validated JWT claims into database-backed authorities.
  - `AccountStatusFilter`: Inspects user status without interfering with JWT validation mechanics.
  - `CustomAuthenticationEntryPoint` & `CustomAccessDeniedHandler`: Enforce uniform JSON error contracts.

---

## 14. Known Limitations & Recommendations

1. **Immediate JWT Revocation**: Supabase access tokens are self-contained JWTs. When an account is deactivated or deleted, existing tokens remain cryptographically valid until their `exp` timestamp. The backend's `AccountStatusFilter` solves this on all API requests by verifying database active status on every request. However, if Supabase direct database RLS queries are used from the frontend, ensure Supabase RLS policies also check `is_active` or user existence.
2. **Key Caching & JWKS Rotation**: Spring Security caches JWKS public keys. When Supabase rotates keys, Spring Security re-queries the JWKS endpoint upon encountering an unknown `kid`. Ensure outgoing HTTPS access from the backend to Supabase is allowed in network firewall configurations.

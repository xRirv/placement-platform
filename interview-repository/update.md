# Update Summary: Company & Application Modules Integration

## Overview
This update implements the end-to-end **Company Management** and **Job Application Tracking** modules across the backend and frontend. The additions integrate seamlessly with the existing database schema (as specified in the Team A ER diagram), authentication pipeline (Supabase OAuth2 Resource Server), and zero-trust authorization architecture without modifying existing interview experience or user management flows.

---

## 1. Company Module

### Backend Architecture
* **Entity & Schema Alignment**:
  * Leveraged the existing `Company` entity matching the ER diagram (`id`, `name`, `industry`, `website`, `description`, `location`, timestamps).
* **Data Access Layer (`CompanyRepository`)**:
  * Added query methods for case-insensitive search by company name (`findByNameContainingIgnoreCase`), industry filtering (`findByIndustryIgnoreCase`), and unique name checks (`existsByNameIgnoreCase`).
  * Supported Spring Data `Pageable` for efficient pagination and sorting.
* **DTO Layer**:
  * Created `CompanyRequest`: Validates required fields (`@NotBlank` name, industry, valid website format, location, description).
  * Created `CompanyResponse`: Immutable record providing clean serialization of company profiles and associated metadata.
* **Service Layer (`CompanyService`)**:
  * Implemented business logic for company creation, retrieval by ID, paginated listing/search, updates, and deletion.
  * Added duplicate name prevention and safe deletion guards against foreign key constraints.
* **Controller Layer (`CompanyController` - `/api/companies`)**:
  * `GET /api/companies`: Public/authenticated search and paginated listing by name or industry.
  * `GET /api/companies/{id}`: Detailed company profile retrieval.
  * `POST /api/companies`: Role-protected creation restricted to `ADMIN` and `MENTOR` roles.
  * `PUT /api/companies/{id}`: Role-protected updates restricted to `ADMIN`.
  * `DELETE /api/companies/{id}`: Role-protected deletion restricted to `ADMIN`.

### Frontend Integration
* **API Service (`companyApi.ts`)**: Modular HTTP client functions handling CRUD operations and search queries with bearer token authentication.
* **UI Components**:
  * **Company Directory View**: Searchable and filterable grid/list showing hiring organizations, industry tags, locations, and direct links to related interview experiences.
  * **Company Detail & Creation Modal**: Management interface for authorized roles to register and edit company profiles.

---

## 2. Application Tracking Module

### Backend Architecture
* **Entity & Schema Alignment**:
  * Integrated the existing `Application` entity linking `Student` and `Company` with fields for `role`, `status` (`Applied`, `OA`, `Interviewing`, `Offer`, `Rejected`), `appliedDate`, `currentRound`, and `notes`.
* **Data Access Layer (`ApplicationRepository`)**:
  * Added query methods: `findByStudentOrderByAppliedDateDesc`, `findByStudentAndStatus`, `findByCompanyId`, and status aggregation counts (`countByStudentAndStatus`).
* **DTO Layer**:
  * Created `ApplicationRequest`: Validates target `companyId`, `role`, initial status, `appliedDate`, `currentRound`, and notes.
  * Created `ApplicationResponse`: Immutable record serializing application state, including embedded company summary and applicant details.
  * Created `ApplicationStatusUpdateRequest`: Specialized payload for rapid stage and status transitions.
* **Service Layer (`ApplicationService`)**:
  * **Zero-Trust Ownership & IDOR Protection**: Enforced caller validation using `CurrentUserService.assertOwnerOrAdmin`, guaranteeing students can only access and modify their own applications while allowing administrative auditing.
  * Automatically resolves the authenticated caller's `Student` profile from `SecurityContext`.
  * Managed the complete recruitment lifecycle from initial application through OA, interviews, offers, or rejections.
  * Provided pipeline summary analytics (total active applications, offers, and distribution by stage).
* **Controller Layer (`ApplicationController` - `/api/applications`)**:
  * `GET /api/applications`: Retrieves the authenticated student's application history with optional status filtering and pagination.
  * `GET /api/applications/{id}`: Returns single application details (ownership verified).
  * `POST /api/applications`: Registers a new job application under the authenticated student.
  * `PUT /api/applications/{id}`: Full update of role, company, round, and notes.
  * `PATCH /api/applications/{id}/status`: Quick status/stage transition endpoint.
  * `DELETE /api/applications/{id}`: Removes an application entry (ownership verified).
  * `GET /api/applications/stats`: Returns aggregated pipeline metrics for the student's dashboard.

### Frontend Integration
* **API Service (`applicationApi.ts`)**: Type-safe client handling application creation, status updates, deletions, and metrics retrieval.
* **UI Components**:
  * **Application Pipeline (Kanban / Table)**: Interactive pipeline categorizing applications into status columns (`Applied`, `OA`, `Interviewing`, `Offer`, `Rejected`) with quick-action stage progression.
  * **Application Tracker Form**: Form to log company, role, application date, interview round notes, and outcome.
  * **Analytics Dashboard Widget**: Visual status distribution metrics summarizing active interview pipelines and success rates.

---

## 3. Security, RBAC & Architectural Integrity

* **Zero-Trust & IDOR Safeguards**: Strict separation of student data. No student can view, edit, or delete another student's job applications.
* **Auditability & Clean Contracts**: All inputs are validated via Jakarta Validation (`@Valid`, `@NotNull`, `@Size`), returning standardized JSON error responses via `CustomAccessDeniedHandler` and `CustomAuthenticationEntryPoint`.
* **Zero Disruption to Existing Code**: Untouched existing interview experience, auth, student profile, mentor, and moderation implementations.

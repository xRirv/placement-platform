# Backend

Spring Boot 4 (Java 21) REST API, secured as an OAuth2 resource server with Supabase JWTs, backed by Supabase
Postgres. It is the only service the browser talks to; it calls the Team B AI service internally.

For the full-platform setup (Docker, both teams, all `.env` files) see the [root README](../../README.md).

## Environment (`.env`)

```bash
cp .env.example .env
```

The app loads `.env` from its working directory on startup (`DotenvEnvironmentPostProcessor`), so no `export`
is needed. In Docker the file is passed with `env_file` and never copied into the image.

| Variable | Value |
|---|---|
| `SPRING_DATASOURCE_URL` | Supabase Postgres JDBC URL, e.g. `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0` |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | e.g. `postgres.<project-ref>` / database password |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` in development |
| `SUPABASE_ISSUER_URI` | `https://<project-ref>.supabase.co/auth/v1` |
| `SUPABASE_JWK_SET_URI` | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin API, used when admins create users |
| `FRONTEND_URL` | allowed CORS origins, comma-separated |
| `AI_SERVICE_URL` | Team B API, e.g. `http://localhost:8000` (Docker: `http://ai-api:8000`); empty disables AI features |
| `AI_SERVICE_API_KEY` | shared secret; must equal Team B's `INTERNAL_API_KEY` |

## Run and test (JDK 21)

```bash
./mvnw spring-boot:run     # http://localhost:8080, Swagger UI at /swagger-ui.html
./mvnw test
```

JDK 24/25 fail to compile with `TypeTag :: UNKNOWN` (Lombok); use JDK 21.

## Main endpoints

All require `Authorization: Bearer <Supabase JWT>` unless noted.

| Area | Endpoints |
|---|---|
| Auth | `GET /api/auth/me`, `POST /api/auth/sync`, `GET /health` (public) |
| Interview experiences | `GET /api/interviews` (approved), `GET /api/interviews/my`, `GET /api/interviews/{id}`, `POST /api/interviews`, `PUT/DELETE /api/interviews/{id}` (submitter or admin) |
| Moderation (admin) | `GET /api/interviews/moderation`, `PATCH /api/interviews/{id}/moderation`, `POST /api/interviews/ai-resync` |
| Questions | `GET /api/questions?q=&topic=&difficulty=&companyId=`, `GET /api/questions/topics`, `POST /api/interviews/{id}/questions`, `PUT/DELETE /api/questions/{id}` |
| Study plans | `POST /api/study-plans/generate`, `GET /api/study-plans`, `GET/PATCH/DELETE /api/study-plans/{id}` |
| Progress | `GET /api/progress/summary`, `GET /api/progress/plan/{planId}`, `POST /api/progress`, `PATCH/DELETE /api/progress/{id}` |
| AI proxy | `POST /api/ai/search`, `POST /api/ai/chat` |
| Student profile | `GET/PUT /api/student/profile` |
| Admin, mentor, alumni, companies, applications | `/api/admin/**`, `/api/mentor/**`, `/api/alumni/**`, `/api/companies`, `/api/applications` |

Behaviour worth knowing:

- **Approval → AI ingest.** When an experience changes to `APPROVED`, the full content is sent to Team B's
  `/api/v1/internal/ingest` **after** the transaction commits. If Team B is down the approval still succeeds and
  the error is logged. `POST /api/interviews/ai-resync` re-sends all approved experiences.
- **Legacy `status` column.** The database constrains it to `Pending | Approved | Rejected`; the service maps
  `moderationStatus` (`PENDING | APPROVED | REJECTED`) onto it.
- **First visit provisioning.** A valid Supabase user without an app record is created as a `STUDENT` on their
  first request, and a student profile is created on first use. Creation is race-safe (`ProvisioningHelper`)
  because the dashboard loads several endpoints in parallel.
- **Errors** are returned as JSON with a readable `message` (`ApiExceptionHandler`).

## Database migrations

SQL files live in `src/main/resources/db/migration/` (V2–V7). There is no migration runner: in development
Hibernate (`ddl-auto=update`) creates the columns; in production the database owner applies these files by hand.
Tests use an in-memory H2 database (`create-drop`).

# Backend

## Authentication & Environment Configuration

The backend is secured using Supabase OAuth2 / JWT resource server verification.
Database connection and JWT validation parameters are configured via environment variables.

### Environment Setup (`.env`)

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set the following variables:
- `SPRING_DATASOURCE_URL`: PostgreSQL connection string (Supabase Transaction Pooler URL, e.g. `jdbc:postgresql://aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require`).
- `SPRING_DATASOURCE_USERNAME`: PostgreSQL username (e.g. `postgres.<project-ref>`).
- `SPRING_DATASOURCE_PASSWORD`: Supabase database password.
- `SPRING_JPA_HIBERNATE_DDL_AUTO`: Set to `update` for dev auto-migration, or `none`/`validate` for production.
- `SUPABASE_ISSUER_URI`: Supabase JWT Issuer URI (`https://<project-ref>.supabase.co/auth/v1`).
- `SUPABASE_JWK_SET_URI`: Supabase JWKS endpoint (`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`).
- `FRONTEND_URL`: Allowed CORS origin(s) (e.g. `http://localhost:5173,http://localhost:3000`).

For complete step-by-step guidance on locating these values in your Supabase dashboard, refer to the root [README.md](../README.md).

### Running Locally

```bash
# Export .env into current shell session and run
export $(grep -v '^#' .env | xargs)
./mvnw spring-boot:run
```

- API Base URL: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Health check: `http://localhost:8080/health`

---

## Interview experience migration

The Team A interview experience workflow is backed by
`src/main/resources/db/migration/V2__interview_experience_workflow.sql`.
This project does not include Flyway or another migration runner, and production
keeps `spring.jpa.hibernate.ddl-auto=none`. The deployment/database owner must
apply that PostgreSQL migration and verify it succeeded before enabling
`/api/interviews`. Tests use Hibernate `create-drop` only and do not replace
the production migration step.

The workflow deliberately keeps `interviewResult` separate from
`moderationStatus`; it does not create study plans or progress records.

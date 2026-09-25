# Backend

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

# Placement Platform

One repository for the full placement platform:

| Folder | Team | What it is |
|---|---|---|
| [`interview-repository/`](interview-repository/) | Team A | Spring Boot backend (`:8080`), React/Vite frontend (`:5173`), Supabase Auth + Postgres |
| [`Placement_Intelligence_Platform/`](Placement_Intelligence_Platform/) | Team B | FastAPI AI service (`:8000`), RabbitMQ, ingestion worker, Google Gemini, Supabase |

Both teams' full git histories are preserved in this repo.

## How it fits together

```
 Browser ──► Team A frontend (:5173)
                │  Supabase JWT
                ▼
          Team A backend (:8080) ──── Supabase project A (auth + app data)
           │                ▲
           │ X-Internal-Api-Key      (internal Docker network only)
           ▼                │
          Team B API (:8000) ──► RabbitMQ ──► Team B worker ──► Gemini
                                                   │
                                                   ▼
                                     Supabase project B (AI knowledge base)
```

- The browser only talks to **Team A's backend**. Team B's API is not exposed outside Docker.
- When an admin **approves** an interview experience, Team A's backend sends the
  experience content to Team B (`POST /api/v1/internal/ingest`) **after** the approval is saved.
  If Team B is down, the approval still succeeds and the error is logged.
- Team A's backend proxies **search** and **chat** to Team B after its own JWT check.
  Students use them from the **AI Assistant** tab on the student dashboard.

## Prerequisites

To run everything with Docker (recommended):

- **Docker** with Docker Compose v2.20 or newer (Docker Desktop on Windows/macOS)
- **Two Supabase projects**: one for Team A, one for Team B (they can be the same project; table names do not clash)
- **Google Gemini API key** (for Team B's AI pipeline)

Additionally, to run services without Docker:

- **JDK 21** for Team A's backend. JDK 24/25 fail to compile it (`TypeTag :: UNKNOWN`, a Lombok incompatibility).
- **Node.js 22** and npm for Team A's frontend
- **Python 3.12** for Team B
- **RabbitMQ** (easiest: `docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management`)

## 1. Set up the databases

**Team A (Supabase project A).** With `SPRING_JPA_HIBERNATE_DDL_AUTO=update` the backend creates and updates its
tables on startup. For production, apply the SQL files in
`interview-repository/backend/src/main/resources/db/migration/` yourself (see
[`interview-repository/backend/README.md`](interview-repository/backend/README.md)).

**Team B (Supabase project B).** On a new database, run these in the Supabase SQL editor, in order:

1. `Placement_Intelligence_Platform/sql/master_schema.sql`
2. `Placement_Intelligence_Platform/sql/preparation_schema.sql`

(The other files in `sql/` are migrations for older databases; do not run them on a new one.)

## 2. Create the three `.env` files

Each `.env` file is git-ignored. Copy the template next to it and fill in real values:

```bash
cp interview-repository/backend/.env.example   interview-repository/backend/.env
cp interview-repository/frontend/.env.example  interview-repository/frontend/.env
cp Placement_Intelligence_Platform/.env.example Placement_Intelligence_Platform/.env
```

First generate **one shared secret** for backend-to-AI calls and use it in both places marked 🔑:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### `interview-repository/backend/.env` (Team A backend)

| Variable | Value |
|---|---|
| `SPRING_DATASOURCE_URL` | Supabase A Postgres JDBC URL, e.g. `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` (Project Settings → Database) |
| `SPRING_DATASOURCE_USERNAME` | e.g. `postgres.<project-ref>` |
| `SPRING_DATASOURCE_PASSWORD` | Supabase A database password |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` for development |
| `SUPABASE_ISSUER_URI` | `https://<project-ref>.supabase.co/auth/v1` |
| `SUPABASE_JWK_SET_URI` | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co`, needed for admins to create users |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase A service-role key (Project Settings → API), needed for admins to create users |
| `FRONTEND_URL` | `http://localhost:5173` (allowed CORS origins, comma-separated) |
| `AI_SERVICE_URL` | `http://localhost:8000` when running locally. Docker Compose overrides it to `http://ai-api:8000`. Leave empty to turn AI features off. |
| `AI_SERVICE_API_KEY` | 🔑 the shared secret |

### `interview-repository/frontend/.env` (Team A frontend)

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` (Supabase A) |
| `VITE_SUPABASE_ANON_KEY` | Supabase A anon/public key |
| `VITE_BACKEND_URL` | `http://localhost:8080` |

`VITE_*` values are built into the browser bundle, so never put secret keys here.

### `Placement_Intelligence_Platform/.env` (Team B)

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` (Supabase B) |
| `SUPABASE_KEY` | Supabase B service-role key (the worker writes to its tables) |
| `AMQP_URL` | `amqp://guest:guest@localhost:5672/` locally. Docker Compose overrides it. |
| `LLM_API_KEY` | Google Gemini API key |
| `INTERNAL_API_KEY` | 🔑 the shared secret (must equal `AI_SERVICE_API_KEY`) |

Optional: `LLM_MODEL`, `EMBEDDING_MODEL`, `WEB_SEARCH_ENABLED`, `VECTOR_SEARCH_ENABLED`, `DRY_RUN`
(see `Placement_Intelligence_Platform/app/core/config.py` for defaults).

## 3. Run everything with Docker

From the repository root:

```bash
docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:5173 | App (Team A frontend) |
| http://localhost:8080 | Team A backend API (Swagger: `/swagger-ui.html`) |

RabbitMQ, the Team B API and the Team B worker run only inside the Docker network.

Useful commands:

```bash
docker compose up --build -d                      # run in background
docker compose logs -f backend ai-api ai-worker   # follow logs
docker compose down                               # stop
```

### Check that the integration works

1. Sign in as an **admin** and approve a pending interview experience.
2. `docker compose logs backend` should show `AI ingest queued experience_id=...`.
3. `docker compose logs ai-worker` should show the experience being processed and `ACK`.
4. Sign in as a **student**, open the **AI Assistant** tab, and try a search or a chat message.

## Running without Docker (local development)

Use five terminals. Start RabbitMQ first (see Prerequisites).

```bash
# Team B API (reads Placement_Intelligence_Platform/.env)
cd Placement_Intelligence_Platform
python -m venv .venv
.venv/Scripts/activate          # Windows; macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000

# Team B worker (same folder and venv)
python -m app.mq.consumers.ingestion_worker

# Team A backend (reads backend/.env from the current folder; needs JDK 21)
cd interview-repository/backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run

# Team A frontend
cd interview-repository/frontend
npm install
npm run dev
```

## Tests

```bash
# Team A backend (JDK 21)
cd interview-repository/backend && ./mvnw test

# Team B
cd Placement_Intelligence_Platform && pip install pytest httpx && python -m pytest
```

## Integration contract

**Team A → Team B: ingest** (sent once, when an experience changes to `APPROVED`):

```http
POST {AI_SERVICE_URL}/api/v1/internal/ingest
X-Internal-Api-Key: <shared secret>
Content-Type: application/json

{
  "experience_id": "<Team A interview_experience.id>",
  "company_name": "Acme",
  "role_title": "SDE-1",
  "raw_content": "Experience text, preparation, timeline and round notes",
  "questions_summary": "...",
  "tips": "...",
  "questions": [{"question_text": "...", "difficulty": "...", "category": "...", "topic": "...", "round": "..."}],
  "interview_date": "2026-09-01",
  "difficulty": "Medium"
}
```

Team B upserts the row into its `experiences` table, queues it on RabbitMQ and returns `202`.
A request with only `experience_id` re-queues an existing row.

**Browser → Team A: AI proxy** (requires `Authorization: Bearer <Supabase JWT>`):

| Endpoint | Body | Forwards to |
|---|---|---|
| `POST /api/ai/search` | `{"query": "...", "filters": {...}, "limit": 20}` | Team B `POST /api/v1/search` |
| `POST /api/ai/chat` | `{"message": "...", "session_id": "..."}` | Team B `POST /api/v1/agents/chat` |

Only these fields are forwarded. Chat sessions are kept separate per user. If Team B is
unreachable, these endpoints return `503`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Backend build fails with `TypeTag :: UNKNOWN` | You're building with JDK 24/25. Use JDK 21. |
| AI Assistant shows "currently unavailable" | Team B isn't running, `AI_SERVICE_URL` is wrong, or the shared secret differs (Team B returns 401). |
| Approval works but nothing is processed | Check `docker compose logs ai-worker`; check the Team B `.env` (Supabase B key, `LLM_API_KEY`) and that the Team B SQL schema was applied. |
| Admin can't create users | Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Team A backend `.env`. |
| Browser CORS error | `FRONTEND_URL` in the Team A backend `.env` must include the frontend's address. |

## Security notes

- Never commit `.env` files. Only the `.env.example` templates belong in git.
- The Supabase **service-role** keys bypass row-level security. Keep them server-side only.
- Team B's API trusts any caller that has the shared secret, so don't publish port 8000 publicly.

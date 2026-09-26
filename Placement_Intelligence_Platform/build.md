# Placement Intelligence Platform — Onboarding Audit

> Generated 2026-09-26. Based on a full read of every file in the repo.

---

## 1. File Structure

```
.
├── app/
│   ├── ai_pipeline/
│   │   ├── runner.py                  # Pipeline orchestrator (imports 8 stages)
│   │   └── stages/
│   │       ├── 01_data_prep.py        # Whitespace normalization
│   │       ├── 02_round_extract.py    # Regex round extraction
│   │       ├── 03_question_extract.py # Split-on-"?" extraction
│   │       ├── 04_normalization.py    # Lowercasing
│   │       ├── 05_topic_classify.py   # Keyword-match topic tagging
│   │       ├── 06_difficulty.py       # Length-based difficulty guess
│   │       ├── 07_similarity.py       # Exact-string dedup
│   │       └── 08_embedding.py        # Stub — returns empty list
│   ├── api/
│   │   ├── deps.py                    # Re-exports get_db (UNUSED)
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── ingest.py          # POST /api/v1/internal/ingest
│   │       │   └── status.py          # GET  /api/v1/internal/experiences/{id}
│   │       └── router.py
│   ├── core/
│   │   ├── config.py                  # Pydantic Settings (reads .env)
│   │   ├── database.py                # SQLAlchemy engine+session (UNUSED)
│   │   └── security.py               # API-key header check (UNUSED)
│   ├── db/
│   │   ├── client.py                  # Supabase SDK client init
│   │   ├── models.py                  # Pydantic ExperienceJob model (UNUSED)
│   │   └── repositories.py           # CRUD via Supabase client
│   ├── mq/
│   │   ├── client.py                  # RabbitMQ/pika connection (uses dotenv)
│   │   ├── producer.py                # Publishes experience_id to exp_queue
│   │   └── consumers/
│   │       └── ingestion_worker.py    # Consumes queue, updates DB status
│   └── main.py                        # FastAPI app entry point
├── tests/
│   └── indext.html                    # Browser prototype (NOT tests; filename typo)
├── bedrock.env                        # AWS credentials — NOT gitignored (see Security)
├── docker-compose.yml
├── Dockerfile
├── README.md
├── requirements.txt
└── .gitignore
```

### Architecture pattern

Monolith with an async worker sidecar. The FastAPI server handles HTTP, writes to Supabase, and enqueues messages to RabbitMQ. A separate worker process consumes the queue and updates the same Supabase table. An 8-stage AI pipeline exists in code but is never invoked.

### Central vs. dead code

| Status | Files |
|--------|-------|
| **Active** | `app/api/v1/endpoints/*`, `app/db/client.py`, `app/db/repositories.py`, `app/mq/*`, `app/main.py`, `app/core/config.py` |
| **Dead / unused** | `app/core/database.py` (SQLAlchemy — nothing imports it for business logic), `app/core/security.py` (API key guard — never applied to any route), `app/api/deps.py` (re-exports the unused get_db), `app/db/models.py` (Pydantic model — never imported anywhere), `app/ai_pipeline/*` (entire pipeline — never called from the worker or API) |

Over half the Python modules are dead code.

---

## 2. Tech Stack & Dependencies

### Languages & frameworks

- **Python 3.12** (per Dockerfile)
- **FastAPI** — HTTP server
- **SQLAlchemy 2.x** — declared but unused; actual DB access is via the **Supabase** Python client
- **Pika** — RabbitMQ AMQP client
- **Pydantic Settings** — configuration
- **Uvicorn** — ASGI server

### requirements.txt

```
fastapi>=0.115,<1.0
pika>=1.3,<2.0
psycopg[binary]>=3.2,<4.0
pydantic-settings>=2.6,<3.0
sqlalchemy>=2.0,<3.0
uvicorn[standard]>=0.34,<1.0
```

### Missing dependencies (will crash on import)

| Import | File | Issue |
|--------|------|-------|
| `from supabase import create_client, Client` | `app/db/client.py` | `supabase` not in requirements.txt |
| `from dotenv import load_dotenv` | `app/mq/client.py` | `python-dotenv` not in requirements.txt |

### Unused dependencies

| Package | Why unused |
|---------|-----------|
| `psycopg[binary]` | The SQLAlchemy/PostgreSQL path (`core/database.py`) is dead code; actual DB access goes through the Supabase SDK |
| `sqlalchemy` | Same — only `core/database.py` uses it, and nothing calls it |

### Build tooling

- **Docker** + **docker-compose** for local orchestration
- No linter, formatter, type-checker, or test framework configured
- No Makefile, justfile, or task runner

---

## 3. Git History Analysis

### Timeline (3 commits, 1 day, single author)

| Date | Hash | Summary |
|------|------|---------|
| 2026-09-24 09:17 | `7071a74` | Initial commit: full project scaffold (37 files, 411 insertions). FastAPI, SQLAlchemy setup, AI pipeline stubs, RabbitMQ skeleton, Dockerfile, docker-compose. |
| 2026-09-24 21:59 | `9768999` | Pivot: replaces SQLAlchemy data layer with Supabase client. Rewrites endpoints, models, repositories. Adds HTML prototype (`tests/indext.html`). **414 insertions, 156 deletions** — effectively a rewrite of the first commit's approach. |
| 2026-09-25 10:06 | `221d89d` | Small fix: RabbitMQ client reads `AMQP_URL` from env instead of hardcoding. README expanded to 161 lines. |

### Branches

Only `main`. No feature branches, no PRs.

### Author

Single contributor: **moddheswar** (`smoddheswar@gmail.com`). One commit has a typo in the email domain (`@mgail.com` in `9768999`).

### Suspicious patterns

- **Entire project scaffolded in one commit** — 37 files at once. No iterative development visible.
- **Architectural pivot in commit 2** without removing the old code. SQLAlchemy, psycopg, `database.py`, `deps.py`, and the `ExperienceJob` model were all left behind as dead code.
- **No .env.example** — the README tells you to set `SUPABASE_URL`, `SUPABASE_KEY`, `AMQP_URL`, but there's no template file.
- **`bedrock.env` is untracked** (shows as `??` in git status) — `.gitignore` only lists `.env`, not `bedrock.env`. If someone runs `git add .` this file (with live AWS credentials) gets committed.

---

## 4. What's Been Built

### Entry points

| Entry point | Command | What it does |
|-------------|---------|-------------|
| FastAPI server | `uvicorn app.main:app` | Serves HTTP on port 8000 |
| Worker | `python -m app.mq.consumers.ingestion_worker` | **Broken — see below** |

### Core logic

The application is meant to accept interview experience submissions, queue them for AI processing, and let clients poll for results. In practice:

1. **POST `/api/v1/internal/ingest`** — Takes an `experience_id` string, updates a Supabase `experiences` table to `QUEUED`, publishes the ID to a RabbitMQ queue (`exp_queue`), returns 202.

2. **GET `/api/v1/internal/experiences/{experience_id}`** — Reads the row from Supabase and returns status, stage, extracted questions, etc.

3. **Worker** — Supposed to consume from `exp_queue`, transition the row through `PROCESSING` → `COMPLETED`, and eventually run AI extraction. Currently the worker file defines `process_message()` but **has no `__main__` block** — running it as a module does nothing (no consumer loop starts).

4. **AI Pipeline** (`app/ai_pipeline/`) — 8 stages of text processing (whitespace cleanup, round extraction, question splitting, normalization, topic classification, difficulty guessing, dedup, embedding). All are placeholder-grade implementations using regex and string length heuristics. The embedding stage returns `[]`. **The pipeline runner is never called from any code path.**

### External services

| Service | How it's used |
|---------|--------------|
| **Supabase** (PostgreSQL) | Primary data store via REST API client. Table: `experiences`. |
| **RabbitMQ / CloudAMQP** | Message queue. Queue: `exp_queue`. |
| **AWS Bedrock** | `bedrock.env` contains credentials, but no code references Bedrock. Likely planned for LLM calls in the AI pipeline. |

### Database schema

No SQL migrations or schema definitions exist in the repo. The schema is implied by the repository methods and model:

```
experiences table (Supabase):
  experience_id   text PK
  company_id      text
  role            text
  interview_date  text
  experience_text text
  status          text  (QUEUED | PROCESSING | COMPLETED | FAILED)
  stage           text  (INGESTION | EMBEDDING | ...)
  error           text
  questions_summary text
  tips            text
  questions       jsonb
  created_at      text
  completed_at    text
```

This table must already exist in Supabase — there's no code to create it.

---

## 5. State of Completion

### What works (in theory)

- FastAPI server starts and serves two endpoints
- The ingest endpoint writes to Supabase and publishes to RabbitMQ
- The status endpoint reads from Supabase
- Docker Compose wires up Postgres (pgvector), RabbitMQ, API, and worker

### What's broken

| Issue | Severity | Details |
|-------|----------|---------|
| **Worker is a no-op** | Critical | `ingestion_worker.py` defines `process_message()` but has no `if __name__ == "__main__"` block or startup code. `docker-compose.yml` runs it as a module, which imports and exits. No messages ever get consumed. |
| **Missing pip dependencies** | Critical | `supabase` and `python-dotenv` are imported but not in `requirements.txt`. `pip install -r requirements.txt` won't install them; `docker build` will produce a broken image. |
| **Two competing DB layers** | Major | `core/database.py` sets up SQLAlchemy with psycopg; `db/client.py` sets up Supabase SDK. Only Supabase is used. The SQLAlchemy path is dead but still gets instantiated at import time (creates an engine against the default SQLite path or `DATABASE_URL`). |
| **Two competing config systems** | Major | `core/config.py` reads `.env` via pydantic-settings (defines `rabbitmq_url`). `mq/client.py` reads `.env` via `python-dotenv` (reads `AMQP_URL`). They use different variable names for the same thing and neither knows about the other. |
| **API key security not applied** | Major | `core/security.py` defines `require_internal_api_key()` but it's never used as a dependency on any route. Both endpoints are completely open. |
| **AI pipeline never called** | Major | `ai_pipeline/runner.py` is never imported. The worker just sleeps 2 seconds and marks the job complete without processing anything. |
| **Docker Compose DB mismatch** | Major | docker-compose spins up a local Postgres (`pgvector/pgvector:pg16`) but the app connects to Supabase via REST SDK. The local Postgres is unused. `DATABASE_URL` env var feeds the dead SQLAlchemy layer. |
| **Pydantic model unused** | Minor | `db/models.py` defines `ExperienceJob` with full field definitions — never imported anywhere. |
| **Frontend payload mismatch** | Minor | The HTML prototype sends a rich payload (student_id, company_id, role, questions array, etc.) but the ingest endpoint only reads `experience_id`. Everything else is silently dropped. |

### Tests

**None.** The `tests/` directory contains only `indext.html` — a browser-based form prototype for manual testing. No pytest, unittest, or any test framework. No test configuration.

### TODOs / stubs

- `08_embedding.py` has a comment: *"Embedding generation belongs behind a provider adapter in production"* — returns `[]`
- The worker has a `# Perform your processing/AI tasks using experience_id...` placeholder comment with a `time.sleep(2)` stand-in
- Topic classification uses hardcoded keyword lists (`"array", "tree", "graph"` → `data_structures`, everything else → `general`)
- Difficulty scoring is based on string length (>140 chars = HARD)

### How to actually start this project

There is no single working path today. To get it running you would need to:

1. Add `supabase` and `python-dotenv` to `requirements.txt`
2. Create a `.env` with `SUPABASE_URL`, `SUPABASE_KEY`, `AMQP_URL`
3. Create the `experiences` table in your Supabase project (no migration file exists)
4. Add a `__main__` block to `ingestion_worker.py` that starts the consumer loop
5. Run `uvicorn app.main:app --reload` for the API
6. Run the worker separately

---

## 6. Configuration & Deployment

### Docker

- **Dockerfile** — Python 3.12-slim, installs from requirements.txt, runs uvicorn. Straightforward but will fail due to missing deps.
- **docker-compose.yml** — Defines 4 services:
  - `postgres` (pgvector:pg16) — **unused by actual app code**
  - `rabbitmq` (3-management) — used
  - `api` — builds from Dockerfile
  - `worker` — same image, different command — **but the command is broken** (no main block)

### Environment variables

The codebase reads env vars from two different systems. Here's the full picture:

| Variable | Read by | Required? | Default |
|----------|---------|-----------|---------|
| `SUPABASE_URL` | `db/client.py` (os.getenv) | Yes | `"https://your-project.supabase.co"` (placeholder) |
| `SUPABASE_KEY` | `db/client.py` (os.getenv) | Yes | `"your-anon-or-service-role-key"` (placeholder) |
| `AMQP_URL` | `mq/client.py` (dotenv/os.getenv) | Yes | `None` (will crash) |
| `DATABASE_URL` | `core/config.py` (pydantic-settings) | No (unused) | `"sqlite:///./placement_intelligence.db"` |
| `RABBITMQ_URL` | `core/config.py` (pydantic-settings) | No (unused) | `"amqp://guest:guest@localhost:5672/"` |
| `INTERNAL_API_KEY` | `core/config.py` (pydantic-settings) | No (unused) | `"change-me"` |
| `LLM_API_KEY` | `core/config.py` (pydantic-settings) | No (unused) | `None` |

Note: docker-compose sets `DATABASE_URL`, `RABBITMQ_URL`, and `INTERNAL_API_KEY` — but none of these are used by the actual running code paths. The variables the code actually needs (`SUPABASE_URL`, `SUPABASE_KEY`, `AMQP_URL`) are not set in docker-compose.

### CI/CD

None. No GitHub Actions, no CI config, no deployment scripts.

### Security concerns

| Issue | Severity |
|-------|----------|
| **`bedrock.env` contains live AWS credentials** (access key, secret key, session token) and is NOT in `.gitignore`. Only `.env` is gitignored. A `git add .` would commit these credentials. | **Critical** |
| **CORS allows all origins with credentials** (`allow_origins=["*"]`, `allow_credentials=True`). Per the CORS spec, browsers should reject this combination, but it signals the intent to be fully open. | High |
| **API endpoints have no authentication** — the security middleware exists but is never wired up. | High |
| **Supabase defaults are placeholder URLs/keys** — if env vars aren't set, the app silently uses `"https://your-project.supabase.co"` which will fail at runtime with unhelpful errors. | Medium |
| **`INTERNAL_API_KEY` defaults to `"change-me"`** in docker-compose and config. | Medium |

---

## Summary

This is a **2-day-old prototype** by a single developer. The scaffolding is ambitious — FastAPI, Supabase, RabbitMQ, an 8-stage AI pipeline, Docker orchestration — but the actual wiring is incomplete. The project pivoted from SQLAlchemy to Supabase mid-build and didn't clean up the old code, leaving two parallel database layers, two config systems, and several modules that are never imported.

**What actually functions:** The FastAPI server starts and can accept/return data from Supabase via two endpoints. RabbitMQ publishing works if credentials are configured.

**What doesn't function:** The worker (no main block), the AI pipeline (never called), authentication (never applied), Docker builds (missing deps), the local Postgres (wrong DB layer).

**Immediate priorities if you want to continue building on this:**
1. Add `bedrock.env` to `.gitignore` immediately and rotate those AWS credentials
2. Add `supabase` and `python-dotenv` to `requirements.txt`
3. Decide on one DB layer (Supabase SDK or SQLAlchemy) and delete the other
4. Add a `__main__` block to the ingestion worker
5. Wire `require_internal_api_key` to the endpoints
6. Remove or consolidate the duplicate config systems

# Placement Intelligence Platform

An end-to-end AI system for collecting, processing, and querying interview experiences. It combines an async ingestion pipeline with a hierarchical multi-agent system for intelligent search, content generation, and interview preparation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  System A — Ingestion Pipeline                               │
│  POST /ingest → RabbitMQ → Worker → 6-stage AI pipeline     │
│  (prepare → extract → normalize → resolve → classify → save) │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  System B — Hierarchical Agent System                        │
│                                                             │
│   MasterAgent  ──────────────────────────────────────────   │
│       │                                                     │
│       ├── SearchAgent      (specialist, no sub-agents)      │
│       ├── ContentAgent     (specialist, no sub-agents)      │
│       └── PreparationAgent (supervisor)                     │
│               ├── SearchAgent                               │
│               └── ContentAgent                             │
└─────────────────────────────────────────────────────────────┘
```

**Tech stack:** FastAPI · Supabase (PostgreSQL) · RabbitMQ · Google Gemini · React/Vite

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12+ |
| Node.js | 18+ |
| npm | 9+ |

You also need accounts / credentials for:

- **Supabase** — database (free tier is fine)
- **Google AI Studio** — Gemini API key (free tier available at [aistudio.google.com](https://aistudio.google.com))
- **RabbitMQ** — either local Docker instance (see below) or a CloudAMQP free plan

---

## Quick Start

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd Placement_Intelligence_Platform
```

### 2. Create a virtual environment and install dependencies

```bash
python -m venv PIP
source PIP/bin/activate          # Windows: PIP\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key

# RabbitMQ
# Local Docker:  amqp://guest:guest@localhost:5672/
# CloudAMQP:     amqps://user:pass@host/vhost
AMQP_URL=amqp://guest:guest@localhost:5672/

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# Security (any random string)
INTERNAL_API_KEY=change-me-before-deploy

# Optional feature flags (default off)
WEB_SEARCH_ENABLED=false
VECTOR_SEARCH_ENABLED=false
```

### 4. Start RabbitMQ (if running locally)

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management
```

RabbitMQ management UI will be at `http://localhost:15672` (guest / guest).

### 5. Start the FastAPI backend

```bash
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 6. Start the ingestion worker (separate terminal)

```bash
source PIP/bin/activate
python -m app.mq.consumers.ingestion_worker
```

The worker listens for queued experience IDs and runs them through the AI pipeline.

### 7. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Frontend Tabs

| Tab | What it does |
|-----|-------------|
| **Pipeline** | Submit an experience ID and watch it move through the ingestion pipeline in real time |
| **Search** | Filter the institutional knowledge base by company, role, topic, category, and difficulty |
| **Agent Chat** | Chat with the Master Agent — ask for interview prep, search questions, or topic explanations |

---

## API Reference

### Ingestion

```http
POST /api/v1/internal/ingest
Content-Type: application/json
X-API-Key: <INTERNAL_API_KEY>

{ "experience_id": "exp_001" }
```

```http
GET /api/v1/internal/experiences/{experience_id}
X-API-Key: <INTERNAL_API_KEY>
```

### Agent Chat (Master Agent)

```http
POST /api/v1/agents/chat
Content-Type: application/json

{
  "message": "Prepare me for a TCS SDE interview",
  "session_id": "any-uuid-string"
}
```

### Search

```http
POST /api/v1/search
Content-Type: application/json

{
  "query": "dynamic programming questions at Infosys",
  "filters": { "company": "Infosys", "role": "SDE", "category": "DSA" },
  "strategy": "auto",
  "limit": 20
}
```

### Preparation

```http
POST /api/v1/agents/preparation
Content-Type: application/json

{
  "company": "Amazon",
  "role": "SDE-2",
  "message": "What should I focus on?"
}
```

### Session

```http
GET /api/v1/agents/session/{session_id}
```

---

## Running Tests

```bash
source PIP/bin/activate

# Agent system tests (38 tests, no external services required)
pytest tests/agents/ -v

# Hierarchy enforcement only
pytest tests/agents/test_hierarchy.py -v

# Full suite (requires rapidfuzz: pip install rapidfuzz)
pip install rapidfuzz
pytest tests/ -v
```

---

## Docker (all services together)

All four services — RabbitMQ, FastAPI API, ingestion worker, and the React frontend — are wired up in `docker-compose.yml` and start in dependency order with healthchecks.

### 1. Copy and fill in `.env`

```bash
cp .env.example .env
# then edit .env and set real values for:
#   SUPABASE_URL, SUPABASE_KEY, LLM_API_KEY, INTERNAL_API_KEY
```

### 2. (First time only) Add your user to the docker group

```bash
sudo usermod -aG docker $USER
# log out and back in, or run: newgrp docker
```

### 3. Build and start everything

```bash
docker compose up --build
```

### 4. Verify services are running

```bash
docker compose ps
```

| Service | URL |
|---------|-----|
| Frontend (React) | http://localhost:80 |
| FastAPI + docs | http://localhost:8000 / http://localhost:8000/docs |
| RabbitMQ UI | http://localhost:15672 (guest / guest) |

### Useful commands

```bash
# Run in background
docker compose up --build -d

# Follow logs for one service
docker compose logs -f api
docker compose logs -f worker

# Stop everything
docker compose down

# Stop and delete volumes
docker compose down -v
```

### How startup ordering works

`docker-compose.yml` uses `depends_on` with `condition: service_healthy`:

1. **RabbitMQ** starts and waits until `rabbitmq-diagnostics ping` passes
2. **API** starts after RabbitMQ is healthy; its own `/health` endpoint is probed
3. **Worker** and **Frontend** start only after the API is healthy

If a service crashes it will restart automatically (`restart: on-failure`).

---

## Project Structure

```
app/
├── ai_pipeline/          # 6-stage ingestion pipeline
├── agents/
│   ├── master/           # Top-level supervisor agent + intent router
│   ├── preparation/      # Preparation supervisor (calls search + content)
│   ├── search/           # Search specialist agent
│   └── content/          # Content specialist agent
├── api/v1/
│   └── endpoints/        # ingest, status, agents, search
├── core/                 # Config and security
├── db/                   # Supabase client and repositories
├── mq/                   # RabbitMQ producer and ingestion worker
├── schemas/              # Shared Pydantic schemas
├── services/             # LLM service (Gemini) and cache
└── tools/
    ├── cache/            # Content and preparation cache helpers
    ├── search/           # DB search tools (question, experience, topic, …)
    └── web/              # Web search, fetch, extract, validate
frontend/
├── src/
│   ├── components/       # AgentChat, SearchPanel, Pipeline, …
│   └── services/api.js   # All API calls
tests/
└── agents/               # Hierarchy, search, content, preparation, master tests
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon or service-role key |
| `AMQP_URL` | Yes | RabbitMQ connection string |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `INTERNAL_API_KEY` | Yes | Protects internal endpoints |
| `WEB_SEARCH_ENABLED` | No | Set `true` to enable web fallback in ContentAgent |
| `VECTOR_SEARCH_ENABLED` | No | Set `true` if pgvector embeddings are configured |
| `LLM_MODEL` | No | Gemini model name (default: `gemini-2.5-flash`) |

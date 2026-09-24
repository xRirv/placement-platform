# Placement Intelligence Platform

A FastAPI ingestion service that persists raw placement experiences, queues processing jobs in RabbitMQ, and runs a modular question-enrichment pipeline.

## Local development

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

The local default uses SQLite. RabbitMQ is required for `POST /api/v1/internal/ingest`; start it separately or use Docker Compose.

In another terminal, run the worker:

```powershell
python -m app.mq.consumers.ingestion_worker
```

Submit a job with the internal key from `.env`:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/v1/internal/ingest `
  -Headers @{ "X-Internal-API-Key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{"raw_text":"Round 1: Explain arrays?"}'
```

## Docker Compose

```powershell
docker compose up --build
```

The API is available at `http://localhost:8000`, RabbitMQ management at `http://localhost:15672`, and API documentation at `http://localhost:8000/docs`.

The numbered stage modules are intentionally small adapters. Replace their heuristics with model-backed implementations as the pipeline contract stabilizes.

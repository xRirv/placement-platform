# README - Part 01: Core Ingestion Service & Queue Integration

## Overview

Part 01 establishes the core ingestion pipeline for interview experiences using FastAPI, Supabase (PostgreSQL), and CloudAMQP (RabbitMQ). The system accepts an experience identifier, updates the processing state in the database, pushes the raw identifier to an asynchronous message queue, and allows clients to poll real-time status as background worker scripts process the job.

---

## What We Built & Accomplished

### 1. Database & Schema Design (Supabase)

* Connected FastAPI to **Supabase** via the official Python client.
* Configured the `experiences` PostgreSQL table to maintain state and hold AI-extracted metadata.
* Defined `experience_id` as the primary lookup key to eliminate redundant internal identifiers.

### 2. Microservice Architecture & Repositories

* Implemented the **Repository Pattern** (`db/repositories.py`) to isolate data access logic for updating job statuses (`QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` / `FAILED`).
* Created Pydantic models (`db/models.py`) matching table columns and supporting structured `JSONB` payloads for extracted questions.

### 3. Asynchronous Task Queue (RabbitMQ)

* Configured CloudAMQP credentials and queue topology (`exp_queue`) in `mq/client.py`.


* Built a lightweight **Producer** (`mq/producer.py`) that publishes **only** the raw `experience_id` string variable to the queue to minimize payload overhead.


* Created an asynchronous **Consumer / Worker** (`mq/consumers/ingestion_worker.py`) that listens for queued `experience_id` strings, updates processing state, and writes back extracted outputs (`questions_summary`, `tips`, and `questions` JSONB) upon completion.



### 4. API Endpoints

* **`POST /api/v1/internal/ingest`**: Accepts an `experience_id`, updates database status to `QUEUED`, enqueues the message in RabbitMQ, and returns a `202 Accepted` response.
* **`GET /api/v1/internal/experiences/{experience_id}`**: Retrieves live processing state, current stage, errors, and extracted results from Supabase.

### 5. CORS & Frontend Prototype

* Configured FastAPI `CORSMiddleware` to automatically handle HTTP `OPTIONS` preflight requests.
* Built and verified an interactive HTML/JS intake prototype for testing end-to-end flow from browser submission to live status polling.

---

## Directory Structure

```text
├── api/
│   └── v1/
│       ├── endpoints/
│       │   ├── ingest.py       # Ingestion POST route
│       │   └── status.py       # Live status GET route
│       └── router.py           # API route aggregator
├── db/
│   ├── client.py               # Supabase client initializer
│   ├── models.py               # Pydantic data schemas
│   └── repositories.py         # Database query & update abstractions
├── mq/
│   ├── client.py               # RabbitMQ connection setup
│   ├── producer.py             # Enqueues experience_id string
│   └── consumers/
│       └── ingestion_worker.py # Background worker processing messages
├── main.py                     # FastAPI entry point & CORS configuration
└── README.md

```

---

## Running the Application Locally

### 1. Environment Configuration

Ensure your environment variables or local `.env` configuration contains:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-anon-or-service-key"
AMQP_URL="amqps://user:***REMOVED***@cloudamqp-host/vhost"

```

### 2. Start the FastAPI Server

```bash
uvicorn main:app --reload

```

*Server runs at `[http://127.0.0.1:8000](http://127.0.0.1:8000)*`

### 3. Start the Background Consumer

In a separate terminal window, launch the RabbitMQ worker:

```bash
python -m mq.consumers.ingestion_worker

```

---

## API Quick Reference

### Ingest Experience

* **Endpoint:** `POST /api/v1/internal/ingest`
* **Payload:**

```json
{
  "experience_id": "exp_8842"
}

```

* **Response (`202 Accepted`):**

```json
{
  "experience_id": "exp_8842",
  "status": "QUEUED",
  "message": "Experience queued for AI processing"
}

```

### Check Experience Processing Status

* **Endpoint:** `GET /api/v1/internal/experiences/exp_8842`
* **Response (`200 OK`):**

```json
{
  "experience_id": "exp_8842",
  "status": "COMPLETED",
  "stage": "EMBEDDING",
  "questions_summary": "Focuses on System Design and Data Structures.",
  "tips": "Revise binary trees.",
  "questions": [
    {
      "round": 1,
      "question": "Implement an LRU Cache",
      "type": "Coding"
    }
  ],
  "error": null
}

```
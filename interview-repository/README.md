# Interview Repository

> **This folder is part of the [Placement Platform](../README.md) monorepo.** To run the whole platform
> (this app plus the AI service) use the root README. Per-part docs:
> [frontend](frontend/README.md) · [backend](backend/README.md).
> The backend `.env` also needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_SERVICE_URL` and
> `AI_SERVICE_API_KEY` (see `backend/.env.example`).

Full-stack application for managing interview experiences, questions, study plans, student profiles, and mentor reviews. Built with a **Spring Boot 4 / Java 21** backend and a **React 19 / TypeScript / Vite** frontend, powered by **Supabase** for user authentication and PostgreSQL storage.

---

## Architecture Overview

```
                                  +---------------------------+
                                  |     Supabase Auth         |
                                  | (Issues & verifies JWTs)  |
                                  +---------------------------+
                                     ^                     ^
                 1. Login / Signup   |                     | 3. JWKS verification
                                     |                     |    (public keys)
                                     v                     v
+--------------------------+  2. Bearer JWT       +-----------------------------------+
|  Frontend (React + Vite) | -------------------> | Backend (Spring Boot REST API)    |
|  Port: 5173              |  POST /api/auth/sync | Port: 8080                        |
+--------------------------+                      +-----------------------------------+
                                                                   |
                                                                   | 4. Stores records
                                                                   v
                                                  +-----------------------------------+
                                                  | Supabase PostgreSQL Database      |
                                                  | (Pooler / Direct connection)      |
                                                  +-----------------------------------+
```

---

## Authentication & Environment Keys Setup

> [!IMPORTANT]
> The `.env` files contain sensitive keys and database passwords and **are not committed to Git**. When you clone or pull this repository, you must create `.env` files in both `frontend/` and `backend/` using the instructions below.

### 1. Where to Find Supabase Keys

Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and select your project:

1. **Project Reference ID (`<project-ref>`)**:
   - Found in your project dashboard URL (`https://supabase.com/dashboard/project/<project-ref>`) or under **Project Settings** > **General**.

2. **Project URL & Anon Key**:
   - Navigate to **Project Settings** > **API**.
   - **Project URL**: e.g., `https://<project-ref>.supabase.co`
   - **Project API Keys**: Copy the `anon` / `public` key (starts with `eyJhbGciOi...`).

3. **JWT Issuer URI & JWKS Set URI**:
   - **Issuer URI**: `https://<project-ref>.supabase.co/auth/v1`
   - **JWKS URI**: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`

4. **Database Connection String & Password**:
   - Navigate to **Project Settings** > **Database** > **Connection string**.
   - Select **URI** or **JDBC** under **Transaction pooler** (recommended for serverless/cloud environments, port 5432 or 6543) or **Session pooler**.
   - Format: `jdbc:postgresql://<pooler-host>:5432/postgres?sslmode=require`
   - **User**: `postgres.<project-ref>` (for pooler) or `postgres` (for direct)
   - **Password**: The database password chosen when the Supabase project was created.

---

### 2. Frontend Configuration (`frontend/.env`)

1. Go to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Copy the template:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and fill in your Supabase credentials:
   ```properties
   # Supabase Project URL (Project Settings > API)
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co

   # Supabase Anon/Public Key (Project Settings > API > Project API Keys > anon)
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

   # Backend API Endpoint
   VITE_BACKEND_URL=http://localhost:8080
   ```

*(Note: The frontend also features a UI config fallback modal if keys are not present in `.env`, storing custom credentials in `localStorage` for development.)*

---

### 3. Backend Configuration (`backend/.env`)

1. Go to the `backend` directory:
   ```bash
   cd backend
   ```

2. Copy the template:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and fill in the database and JWT verification properties:
   ```properties
   # Supabase PostgreSQL Connection Pooler URL (Project Settings > Database)
   SPRING_DATASOURCE_URL=jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
   SPRING_DATASOURCE_USERNAME=postgres.<your-project-ref>
   SPRING_DATASOURCE_PASSWORD=your-database-password

   # Hibernate DDL Auto ('update' for development; 'none' or 'validate' for production)
   SPRING_JPA_HIBERNATE_DDL_AUTO=update

   # Supabase Auth / OAuth2 Resource Server JWT verification
   SUPABASE_ISSUER_URI=https://<your-project-ref>.supabase.co/auth/v1
   SUPABASE_JWK_SET_URI=https://<your-project-ref>.supabase.co/auth/v1/.well-known/jwks.json

   # Allowed CORS Origins (comma-separated)
   FRONTEND_URL=http://localhost:5173,http://localhost:3000
   ```

---

## How Authentication Flow Works

1. **User Authentication**:
   - The user signs in or signs up via the React UI ([`AuthCard`](file:///home/alekh/projects/interview-experience/interview-repository/frontend/src/components/AuthCard.tsx)).
   - Handled directly by Supabase Auth client ([`getSupabaseClient`](file:///home/alekh/projects/interview-experience/interview-repository/frontend/src/lib/supabaseClient.ts)).
   - Supabase returns a session with a signed JWT access token.

2. **Backend Profile Synchronization**:
   - Immediately upon sign-in/sign-up, the frontend triggers [`syncUserWithBackend()`](file:///home/alekh/projects/interview-experience/interview-repository/frontend/src/lib/supabaseClient.ts) calling `POST /api/auth/sync` with `Authorization: Bearer <access_token>`.
   - The Spring Boot backend ([`SecurityConfig`](file:///home/alekh/projects/interview-experience/interview-repository/backend/src/main/java/com/agenticai/interviewrepo/config/SecurityConfig.java)) intercepts the request, verifies the token signature against Supabase's JWKS endpoint, validates issuer/expiration, and extracts the claims (`sub` = Supabase UUID, `email`, `role`).
   - [`AuthService`](file:///home/alekh/projects/interview-experience/interview-repository/backend/src/main/java/com/agenticai/interviewrepo/service/AuthService.java) creates or updates the user profile record in the database.

3. **Subsequent API Requests**:
   - Protected API requests include the JWT bearer token in the `Authorization` header.
   - Spring Security checks user roles (`STUDENT`, `ALUMNI`, `MENTOR`, `ADMIN`) before granting access to secured endpoints.

---

## Running the Application Locally

### Prerequisites
- **Node.js** (v18+ or v20+) and **pnpm**
- **Java JDK 21**
- **Maven** (or use the included `./mvnw` wrapper)

### 1. Start Backend

```bash
cd backend

# Option A: Export .env variables into the shell session
export $(grep -v '^#' .env | xargs)
./mvnw spring-boot:run

# Option B: Run directly if environment variables are set in your IDE (IntelliJ / VS Code)
./mvnw spring-boot:run
```

- Backend runs at: `http://localhost:8080`
- Swagger / OpenAPI UI: `http://localhost:8080/swagger-ui.html`
- Health check: `http://localhost:8080/health`

### 2. Start Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

- Frontend runs at: `http://localhost:5173`

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| **CORS error on `/api/auth/sync`** | `FRONTEND_URL` in `backend/.env` does not match the frontend origin. | Ensure `FRONTEND_URL` in `backend/.env` includes your frontend URL (e.g. `http://localhost:5173` or your tunnel URL). |
| **401 Unauthorized / Invalid Token** | `SUPABASE_ISSUER_URI` or `SUPABASE_JWK_SET_URI` is incorrect. | Verify that the issuer URI in `backend/.env` matches `https://<project-ref>.supabase.co/auth/v1` exactly. |
| **Database Connection Refused / SSL Error** | Supabase requires SSL on pooler connections. | Ensure `?sslmode=require` is present at the end of `SPRING_DATASOURCE_URL`. |
| **"Invalid API key" on Frontend** | `VITE_SUPABASE_ANON_KEY` is wrong or using service role key. | Make sure to copy the `anon` `public` key from the Supabase dashboard, not the secret `service_role` key. |

# Frontend

React 19 + TypeScript + Vite application with Supabase Authentication and Spring Boot integration.

---

## Environment Setup (`.env`)

The frontend communicates with Supabase for client-side authentication and calls the backend `/api/auth/sync` and resource endpoints.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Supabase project keys:
   ```properties
   # Supabase Project URL (Dashboard -> Project Settings -> API)
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co

   # Supabase Anon Public Key (Dashboard -> Project Settings -> API -> anon)
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

   # Backend API Endpoint
   VITE_BACKEND_URL=http://localhost:8080
   ```

For detailed instructions on obtaining these values from Supabase, see the root [README.md](../README.md).

*(Note: If `.env` is omitted, the frontend includes a runtime fallback configuration modal allowing developers to input their Supabase credentials directly in the UI, stored in `localStorage`.)*

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start Vite dev server
pnpm run dev

# Build for production
pnpm run build

# Run linter
pnpm run lint
```

- Dev Server URL: `http://localhost:5173`

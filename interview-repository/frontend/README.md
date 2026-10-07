# Frontend

React 19 + Vite (JavaScript/JSX) single-page app. It uses Supabase for sign-in and talks **only** to the
Team A backend (`VITE_BACKEND_URL`). AI features reach the Team B service through the backend's `/api/ai/*`
proxy, never directly from the browser.

For the full-platform setup (Docker, both teams, all `.env` files) see the [root README](../../README.md).

## Environment (`.env`)

```bash
cp .env.example .env
```

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` (Supabase → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | the project's **anon / public** key |
| `VITE_BACKEND_URL` | `http://localhost:8080` |

`VITE_*` values are built into the browser bundle, so never put a secret key here.
If `.env` is missing, the app shows a setup dialog where Supabase details can be entered (stored in `localStorage`).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run lint
```

In Docker the app is built with Vite and served by nginx (`Dockerfile`, `nginx.conf`, SPA fallback to `index.html`).

## Routes

| Path | Who | Page |
|---|---|---|
| `/login` | everyone | Sign in / create account |
| `/student` | students | Overview: greeting, progress, continue where you left off, recommendations, recent activity |
| `/student/experiences` | students | Interview experiences (search + company / difficulty / outcome filters) |
| `/student/experiences/:id` | students | Experience detail: process timeline, questions asked, what to prepare |
| `/student/submissions` | students | My Submissions: status filters, search, submit / edit an experience |
| `/student/questions` | students | Question Bank: search, company / difficulty / topic filters, "Practice" with AI |
| `/student/plan` | students | AI Study Plan: generate, track topic status, today's focus, weekly progress |
| `/student/assistant` | students | AI Interview Assistant: suggested actions, chat, knowledge-base search |
| `/student/profile` | students | Candidate Profile with completeness indicator |
| `/student/companies` | students | Target Companies directory with preparation progress |
| `/student/mentor` | students | Mentor assignment status and details |
| `/admin/*`, `/mentor`, `/alumni` | by role | Admin, mentor and alumni dashboards |

## Code layout

```
src/
  App.jsx                     auth state, role-based routing
  main.jsx                    root with a global error boundary
  lib/
    api.js                    fetch wrapper (JWT header, readable errors)
    format.js                 date / count helpers
    supabaseClient.js         Supabase client
  styles/workspace.css        student workspace design system (scoped under .ws)
  components/
    StudentDashboard.jsx      /student/* routes
    student/                  one file per student page + shell and data layer
      StudentShell.jsx        sidebar, mobile drawer, per-page error boundary
      StudentData.jsx         shared data (profile, experiences, submissions, plans)
                              with loading / error / reload for every resource
    ui/ui.jsx                 shared UI kit (PageHeader, StatCard, StatusBadge,
                              CompanyAvatar, SearchBar, Segmented, EmptyState,
                              ErrorState, skeletons, ProgressBar, ErrorBoundary)
    ExperienceModal.jsx       submit / edit interview experience form
    admin/, AdminDashboard.jsx, MentorDashboard.jsx, AlumniDashboard.jsx
```

## Design system (student workspace)

- Tokens are CSS variables in `styles/workspace.css` (`--ws-*`): warm off-white background, dark green text,
  one green accent (violet only for secondary tags), 1px borders, 10–16px radii, subtle shadows, Inter font.
- Every data-driven page renders a **skeleton** while loading, an **error state with Retry** on failure, and an
  **empty state with a call to action** when there is no data. Render errors are caught by error boundaries,
  so a page can never turn into a blank screen.
- Responsive: below 1024px the sidebar becomes a drawer (menu button, Esc or tap outside to close);
  below 720px lists stack, forms go single-column and filters collapse behind a "Filters" button.
- Accessibility: visible focus rings, labelled inputs and icon buttons, `aria-current` on the active nav item,
  status badges always include text (not just color), and reduced-motion support.

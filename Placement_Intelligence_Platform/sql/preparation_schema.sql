-- Preparation pipeline schema
-- Add new tables and indexes for preparation-stage artifacts.

create table if not exists preparation_runs (
    id uuid primary key default gen_random_uuid(),
    experience_id text not null,
    status text not null default 'PENDING',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists preparation_runs_experience_idx
    on preparation_runs (experience_id, status);

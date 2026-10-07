-- Placement Intelligence Platform offline schema
-- PostgreSQL / Supabase compatible. Apply to a fresh database only.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table experiences (
    id uuid primary key default gen_random_uuid(),
    experience_id text not null unique,
    student_id text,
    company_name text,
    role_title text,
    interview_date date,
    difficulty text,
    status text not null default 'QUEUED'
        check (status in ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    stage text,
    error text,
    completed_at timestamptz,
    raw_content text,
    questions_summary text,
    tips text,
    questions jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    normalized_name text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table roles (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    normalized_name text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table rounds (
    id uuid primary key default gen_random_uuid(),
    experience_id text not null references experiences(experience_id) on delete cascade,
    round_number integer not null check (round_number > 0),
    round_name text not null,
    round_format text,
    duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
    order_index integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (experience_id, round_number)
);

create table question_canonical (
    id uuid primary key default gen_random_uuid(),
    canonical_text text not null,
    normalized_text text not null unique,
    category text,
    topic text,
    subtopic text,
    difficulty text check (difficulty is null or difficulty in ('EASY', 'MEDIUM', 'HARD', 'UNKNOWN')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table topics (
    id uuid primary key default gen_random_uuid(),
    category text not null,
    topic text not null default '',
    subtopic text not null default '',
    created_at timestamptz not null default now(),
    unique (category, topic, subtopic)
);

create table entity_aliases (
    id uuid primary key default gen_random_uuid(),
    entity_type text not null check (entity_type in ('COMPANY', 'ROLE', 'QUESTION')),
    entity_id uuid not null,
    alias_text text not null,
    normalized_value text not null,
    created_at timestamptz not null default now(),
    unique (entity_type, normalized_value)
);

create table experience_companies (
    experience_id text not null references experiences(experience_id) on delete cascade,
    company_id uuid not null references companies(id) on delete restrict,
    is_primary boolean not null default false,
    created_at timestamptz not null default now(),
    primary key (experience_id, company_id)
);

create table experience_roles (
    experience_id text not null references experiences(experience_id) on delete cascade,
    role_id uuid not null references roles(id) on delete restrict,
    is_primary boolean not null default false,
    created_at timestamptz not null default now(),
    primary key (experience_id, role_id)
);

create table experience_questions (
    experience_id text not null references experiences(experience_id) on delete cascade,
    question_id uuid not null references question_canonical(id) on delete restrict,
    round_id uuid references rounds(id) on delete restrict,
    question_order integer not null check (question_order > 0),
    asked_text text not null,
    created_at timestamptz not null default now(),
    primary key (experience_id, question_order),
    unique (experience_id, question_id, question_order)
);

create table question_topics (
    question_id uuid not null references question_canonical(id) on delete cascade,
    topic_id uuid not null references topics(id) on delete cascade,
    confidence numeric(5,4) check (confidence between 0 and 1),
    source text not null default 'rules',
    created_at timestamptz not null default now(),
    primary key (question_id, topic_id)
);

create table provenance (
    id uuid primary key default gen_random_uuid(),
    experience_id text not null references experiences(experience_id) on delete cascade,
    entity_type text not null,
    entity_id uuid,
    segment_indices jsonb not null default '[]'::jsonb,
    source_texts jsonb not null default '[]'::jsonb,
    extraction_confidence numeric(5,4),
    resolution_method text,
    resolution_score numeric(5,4),
    created_at timestamptz not null default now(),
    unique (experience_id, entity_type, entity_id, resolution_method)
);

create index experiences_status_idx on experiences(status, stage);
create index experiences_company_idx on experiences(company_name);
create index companies_name_trgm_idx on companies using gin (name gin_trgm_ops);
create index roles_name_trgm_idx on roles using gin (name gin_trgm_ops);
create index questions_text_trgm_idx on question_canonical using gin (canonical_text gin_trgm_ops);
create index rounds_experience_order_idx on rounds(experience_id, order_index);
create index experience_questions_question_idx on experience_questions(question_id);
create index aliases_normalized_idx on entity_aliases(normalized_value);
create index provenance_experience_idx on provenance(experience_id);

create trigger experiences_updated_at before update on experiences
for each row execute function set_updated_at();
create trigger companies_updated_at before update on companies
for each row execute function set_updated_at();
create trigger roles_updated_at before update on roles
for each row execute function set_updated_at();
create trigger rounds_updated_at before update on rounds
for each row execute function set_updated_at();
create trigger questions_updated_at before update on question_canonical
for each row execute function set_updated_at();

-- The backend should connect with the Supabase service role for worker writes.
-- Add RLS policies here when client-side access to these tables is required.

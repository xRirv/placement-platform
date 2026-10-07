-- Placement Intelligence Platform master schema
--
-- Use this file for a NEW PostgreSQL/Supabase database.
-- It replaces the separate fresh schema and raw-experience migration scripts.
-- Do not run migrate_raw_experiences.sql when creating a new database.

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

-- Raw source of truth. Company and role IDs are intentionally absent here;
-- the AI pipeline resolves canonical IDs into the relationship tables below.
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
    -- Denormalized count kept in sync by triggers on experience_questions.
    -- Avoids a COUNT() join on every search query.
    occurrence_count integer not null default 0,
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

-- ── occurrence_count triggers ─────────────────────────────────────────────
-- Keep question_canonical.occurrence_count in sync whenever a row is
-- inserted into or deleted from experience_questions.

create or replace function increment_question_occurrence()
returns trigger language plpgsql as $$
begin
    update question_canonical
    set occurrence_count = occurrence_count + 1
    where id = new.question_id;
    return new;
end;
$$;

create or replace function decrement_question_occurrence()
returns trigger language plpgsql as $$
begin
    update question_canonical
    set occurrence_count = greatest(0, occurrence_count - 1)
    where id = old.question_id;
    return old;
end;
$$;

create trigger experience_questions_inc_count
    after insert on experience_questions
    for each row execute function increment_question_occurrence();

create trigger experience_questions_dec_count
    after delete on experience_questions
    for each row execute function decrement_question_occurrence();

-- ── question_with_context view ────────────────────────────────────────────
-- Joins question_canonical with its associated companies and roles so the
-- agent layer can retrieve them in a single query instead of a multi-step
-- Python join.

create or replace view question_with_context as
select
    q.id,
    q.canonical_text,
    q.normalized_text,
    q.category,
    q.topic,
    q.subtopic,
    q.difficulty,
    q.occurrence_count,
    q.created_at,
    q.updated_at,
    array_remove(array_agg(distinct c.name), null)  as companies,
    array_remove(array_agg(distinct r.name), null)  as roles
from question_canonical q
left join experience_questions eq on eq.question_id = q.id
left join experience_companies ec on ec.experience_id = eq.experience_id
left join companies c              on c.id = ec.company_id
left join experience_roles er      on er.experience_id = eq.experience_id
left join roles r                  on r.id = er.role_id
group by q.id;

-- Backend workers should connect with the Supabase service-role key.
-- Add RLS policies separately if browser/client access is introduced.

-- Example raw insert:
-- insert into public.experiences
--     (experience_id, company_name, role_title, raw_content, questions, created_at)
-- values
--     ('exp_001', 'Stripe', 'SDE-1', 'Full interview narrative...',
--      '[{"question_text":"Reverse a linked list","difficulty":"medium"}]'::jsonb,
--      now());

-- Migration: add occurrence_count column, sync triggers, and question_with_context view
-- Run this ONCE on an existing database that was created with the old schema.
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE / DO-block guards.

-- ── 1. Add occurrence_count column ──────────────────────────────────────────
alter table question_canonical
    add column if not exists occurrence_count integer not null default 0;

-- ── 2. Backfill from existing experience_questions rows ───────────────────
update question_canonical q
set occurrence_count = (
    select count(*)
    from experience_questions eq
    where eq.question_id = q.id
);

-- ── 3. Trigger: increment on insert ───────────────────────────────────────
create or replace function increment_question_occurrence()
returns trigger language plpgsql as $$
begin
    update question_canonical
    set occurrence_count = occurrence_count + 1
    where id = new.question_id;
    return new;
end;
$$;

do $$ begin
    if not exists (
        select 1 from pg_trigger
        where tgname = 'experience_questions_inc_count'
    ) then
        create trigger experience_questions_inc_count
            after insert on experience_questions
            for each row execute function increment_question_occurrence();
    end if;
end $$;

-- ── 4. Trigger: decrement on delete ───────────────────────────────────────
create or replace function decrement_question_occurrence()
returns trigger language plpgsql as $$
begin
    update question_canonical
    set occurrence_count = greatest(0, occurrence_count - 1)
    where id = old.question_id;
    return old;
end;
$$;

do $$ begin
    if not exists (
        select 1 from pg_trigger
        where tgname = 'experience_questions_dec_count'
    ) then
        create trigger experience_questions_dec_count
            after delete on experience_questions
            for each row execute function decrement_question_occurrence();
    end if;
end $$;

-- ── 5. question_with_context view ─────────────────────────────────────────
-- Joins question_canonical through to canonical company and role names so
-- the agent layer can read all three in a single query.
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

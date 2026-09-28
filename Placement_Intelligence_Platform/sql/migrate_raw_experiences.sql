-- Supabase SQL Editor migration for raw experience input fields.
-- Run this once against the existing public.experiences table.
-- Old company_id values are intentionally not copied into company_name:
-- they are IDs, while the pipeline must resolve names to canonical IDs later.

begin;

alter table public.experiences
    add column if not exists company_name text,
    add column if not exists role_title text,
    add column if not exists raw_content text;

-- role currently contains the raw role title in the legacy table.
update public.experiences
set role_title = coalesce(role_title, role)
where role_title is null
  and role is not null;

-- experience_text is the legacy name for the raw source document.
update public.experiences
set raw_content = coalesce(raw_content, experience_text)
where raw_content is null
  and experience_text is not null;

-- Do not copy company_id into company_name. The pipeline extracts/resolves the
-- company name from company_name/raw_content and creates canonical relationships.
alter table public.experiences
    drop column if exists company_id,
    drop column if exists role,
    drop column if exists experience_text;

drop index if exists public.experiences_company_idx;
create index if not exists experiences_company_name_idx
    on public.experiences(company_name);

commit;

-- New raw rows can now use:
-- insert into public.experiences
--     (experience_id, company_name, role_title, raw_content, questions, created_at)
-- values
--     ('exp_001', 'Stripe', 'SDE-1', 'Full interview narrative...',
--      '[{"question_text":"Reverse a linked list","difficulty":"medium"}]'::jsonb,
--      now());

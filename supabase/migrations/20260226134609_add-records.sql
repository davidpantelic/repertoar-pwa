create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "syncedAt" timestamptz,
  "deletedAt" timestamptz,
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade
);

create index if not exists records_user_id_idx on public.records(user_id);

alter table public.records enable row level security;

drop policy if exists "records_owner_all" on public.records;

create policy "records_owner_all"
on public.records
as permissive
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

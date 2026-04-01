create table if not exists public.auth_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type = 'force_logout'),
  created_at timestamptz not null default now()
);

create index if not exists auth_events_user_id_idx
  on public.auth_events(user_id);

alter table public.auth_events enable row level security;

drop policy if exists "auth_events_select_own" on public.auth_events;
create policy "auth_events_select_own"
on public.auth_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "auth_events_insert_own" on public.auth_events;
create policy "auth_events_insert_own"
on public.auth_events
for insert
to authenticated
with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'auth_events'
  ) then
    alter publication supabase_realtime add table public.auth_events;
  end if;
end $$;

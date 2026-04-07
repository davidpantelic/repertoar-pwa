alter table public.songs
  add column if not exists note_encrypted text,
  add column if not exists note_iv text,
  add column if not exists note_version smallint not null default 1;

create table if not exists public.user_note_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wrapped_key text not null,
  key_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_note_keys_created_at_idx
  on public.user_note_keys(created_at);

drop trigger if exists trg_user_note_keys_updated_at on public.user_note_keys;
create trigger trg_user_note_keys_updated_at
before update on public.user_note_keys
for each row
execute function public.set_updated_at();

alter table public.user_note_keys enable row level security;

drop policy if exists "user_note_keys_select_own" on public.user_note_keys;
create policy "user_note_keys_select_own"
on public.user_note_keys
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_note_keys_insert_own" on public.user_note_keys;
create policy "user_note_keys_insert_own"
on public.user_note_keys
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_note_keys_update_own" on public.user_note_keys;
create policy "user_note_keys_update_own"
on public.user_note_keys
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

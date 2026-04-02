create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null,
  artist text,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null,
  note text,
  songs_count integer not null default 0,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null
    references public.playlists(id) on delete cascade,
  song_id uuid not null
    references public.songs(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playlist_songs_playlist_song_unique unique (playlist_id, song_id)
);

create index if not exists songs_user_id_idx
  on public.songs(user_id);

create index if not exists songs_user_deleted_idx
  on public.songs(user_id, deleted_at, created_at);

create index if not exists songs_deleted_at_idx
  on public.songs(deleted_at);

create index if not exists playlists_user_id_idx
  on public.playlists(user_id);

create index if not exists playlists_user_deleted_sort_idx
  on public.playlists(user_id, deleted_at, sort_order, created_at);

create index if not exists playlists_deleted_at_idx
  on public.playlists(deleted_at);

create index if not exists playlists_user_sort_idx
  on public.playlists(user_id, sort_order, created_at);

create index if not exists playlist_songs_playlist_id_idx
  on public.playlist_songs(playlist_id);

create index if not exists playlist_songs_song_id_idx
  on public.playlist_songs(song_id);

create index if not exists playlist_songs_playlist_position_idx
  on public.playlist_songs(playlist_id, position, created_at);

drop trigger if exists trg_songs_updated_at on public.songs;
create trigger trg_songs_updated_at
before update on public.songs
for each row
execute function public.set_updated_at();

drop trigger if exists trg_playlists_updated_at on public.playlists;
create trigger trg_playlists_updated_at
before update on public.playlists
for each row
execute function public.set_updated_at();

drop trigger if exists trg_playlist_songs_updated_at on public.playlist_songs;
create trigger trg_playlist_songs_updated_at
before update on public.playlist_songs
for each row
execute function public.set_updated_at();

create or replace function public.has_active_subscription(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscription_plan sp
    where sp.user_id = target_user_id
      and (sp.trial = true or sp.basic = true)
  );
$$;

create or replace function public.refresh_playlist_songs_count(target_playlist_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.playlists p
  set
    songs_count = (
      select count(*)
      from public.playlist_songs ps
      where ps.playlist_id = target_playlist_id
    ),
    updated_at = now()
  where p.id = target_playlist_id;
$$;

create or replace function public.handle_playlist_songs_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_playlist_songs_count(old.playlist_id);
    return old;
  end if;

  perform public.refresh_playlist_songs_count(new.playlist_id);

  if tg_op = 'UPDATE' and old.playlist_id <> new.playlist_id then
    perform public.refresh_playlist_songs_count(old.playlist_id);
  end if;

  return new;
end;
$$;

create or replace function public.purge_expired_deleted_songs_and_playlists()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.songs
  where deleted_at is not null
    and deleted_at <= now() - interval '30 days';

  delete from public.playlists
  where deleted_at is not null
    and deleted_at <= now() - interval '30 days';
end;
$$;

drop trigger if exists trg_playlist_songs_count_change on public.playlist_songs;
create trigger trg_playlist_songs_count_change
after insert or update or delete on public.playlist_songs
for each row
execute function public.handle_playlist_songs_change();

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'purge_expired_deleted_songs_and_playlists';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'purge_expired_deleted_songs_and_playlists',
    '0 3 * * *',
    $job$select public.purge_expired_deleted_songs_and_playlists();$job$
  );
end $$;

alter table public.songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;

drop policy if exists "songs_select_own_active_subscription" on public.songs;
create policy "songs_select_own_active_subscription"
on public.songs
for select
to authenticated
using (
  user_id = auth.uid()
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "songs_insert_own_active_subscription" on public.songs;
create policy "songs_insert_own_active_subscription"
on public.songs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "songs_update_own_active_subscription" on public.songs;
create policy "songs_update_own_active_subscription"
on public.songs
for update
to authenticated
using (
  user_id = auth.uid()
  and public.has_active_subscription(auth.uid())
)
with check (
  user_id = auth.uid()
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "songs_delete_own_active_subscription" on public.songs;

drop policy if exists "playlists_select_own_active_subscription" on public.playlists;
create policy "playlists_select_own_active_subscription"
on public.playlists
for select
to authenticated
using (
  user_id = auth.uid()
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "playlists_insert_own_active_subscription" on public.playlists;
create policy "playlists_insert_own_active_subscription"
on public.playlists
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "playlists_update_own_active_subscription" on public.playlists;
create policy "playlists_update_own_active_subscription"
on public.playlists
for update
to authenticated
using (
  user_id = auth.uid()
  and public.has_active_subscription(auth.uid())
)
with check (
  user_id = auth.uid()
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "playlists_delete_own_active_subscription" on public.playlists;

drop policy if exists "playlist_songs_select_own_active_subscription" on public.playlist_songs;
create policy "playlist_songs_select_own_active_subscription"
on public.playlist_songs
for select
to authenticated
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.user_id = auth.uid()
      and p.deleted_at is null
  )
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "playlist_songs_insert_own_active_subscription" on public.playlist_songs;
create policy "playlist_songs_insert_own_active_subscription"
on public.playlist_songs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.user_id = auth.uid()
      and p.deleted_at is null
  )
  and exists (
    select 1
    from public.songs s
    where s.id = song_id
      and s.user_id = auth.uid()
      and s.deleted_at is null
  )
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "playlist_songs_update_own_active_subscription" on public.playlist_songs;
create policy "playlist_songs_update_own_active_subscription"
on public.playlist_songs
for update
to authenticated
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.user_id = auth.uid()
      and p.deleted_at is null
  )
  and public.has_active_subscription(auth.uid())
)
with check (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.user_id = auth.uid()
      and p.deleted_at is null
  )
  and exists (
    select 1
    from public.songs s
    where s.id = song_id
      and s.user_id = auth.uid()
      and s.deleted_at is null
  )
  and public.has_active_subscription(auth.uid())
);

drop policy if exists "playlist_songs_delete_own_active_subscription" on public.playlist_songs;
create policy "playlist_songs_delete_own_active_subscription"
on public.playlist_songs
for delete
to authenticated
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_id
      and p.user_id = auth.uid()
      and p.deleted_at is null
  )
  and public.has_active_subscription(auth.uid())
);

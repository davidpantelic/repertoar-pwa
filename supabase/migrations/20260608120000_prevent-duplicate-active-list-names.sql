create unique index if not exists playlists_user_active_name_unique
  on public.playlists (user_id, lower(btrim(name)))
  where deleted_at is null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, lang)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      'User'
    ),
    null,
    coalesce(new.raw_user_meta_data->>'lang', 'en')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    lang = coalesce(excluded.lang, public.profiles.lang),
    updated_at = now();

  return new;
end;
$$;

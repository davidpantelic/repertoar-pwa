create extension if not exists pg_cron;

create table if not exists public.subscription_plan (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'User',
  email text not null,
  trial boolean not null default true,
  basic boolean not null default false,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '15 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_plan_user_id_idx
  on public.subscription_plan(user_id);

create index if not exists subscription_plan_trial_idx
  on public.subscription_plan(trial, trial_ends_at);

drop trigger if exists trg_subscription_plan_updated_at on public.subscription_plan;
create trigger trg_subscription_plan_updated_at
before update on public.subscription_plan
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_subscription_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscription_plan (
    user_id,
    name,
    email,
    trial,
    basic,
    trial_started_at,
    trial_ends_at
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      'User'
    ),
    coalesce(new.email, ''),
    true,
    false,
    now(),
    now() + interval '15 days'
  )
  on conflict (user_id) do update
  set
    name = excluded.name,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_subscription_plan_created on auth.users;
create trigger on_auth_user_subscription_plan_created
after insert on auth.users
for each row
execute function public.handle_new_subscription_plan();

insert into public.subscription_plan (
  user_id,
  name,
  email,
  trial,
  basic,
  trial_started_at,
  trial_ends_at
)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    'User'
  ),
  coalesce(u.email, ''),
  case
    when coalesce(u.created_at, now()) + interval '15 days' > now() then true
    else false
  end as trial,
  false as basic,
  coalesce(u.created_at, now()) as trial_started_at,
  coalesce(u.created_at, now()) + interval '15 days' as trial_ends_at
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.deactivate_expired_trials()
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscription_plan
  set
    trial = false,
    updated_at = now()
  where trial = true
    and trial_ends_at <= now();
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'deactivate_expired_subscription_trials';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'deactivate_expired_subscription_trials',
    '0 * * * *',
    $job$select public.deactivate_expired_trials();$job$
  );
end $$;

alter table public.subscription_plan enable row level security;

drop policy if exists "subscription_plan_select_own" on public.subscription_plan;
create policy "subscription_plan_select_own"
on public.subscription_plan
for select
to authenticated
using (user_id = auth.uid());

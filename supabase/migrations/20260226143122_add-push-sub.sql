create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text,
  auth text,
  subscription jsonb,
  "createdAt" timestamptz not null default now(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_owner_all" on public.push_subscriptions;

create policy "push_subscriptions_owner_all"
on public.push_subscriptions
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.push_subscriptions
add constraint push_subscriptions_endpoint_not_empty
check (length(trim(endpoint)) > 0);

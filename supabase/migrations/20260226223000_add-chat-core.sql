create extension if not exists pgcrypto;

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  conversation_id uuid not null
    references public.chat_conversations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null
    references auth.users(id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists chat_participants_user_idx
  on public.chat_participants(user_id, conversation_id);

create index if not exists chat_messages_conv_created_idx
  on public.chat_messages(conversation_id, created_at desc);

create or replace function public.is_chat_participant(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_participants p
    where p.conversation_id = conv_id
      and p.user_id = auth.uid()
  );
$$;

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_conversations_select_visible" on public.chat_conversations;
create policy "chat_conversations_select_visible"
on public.chat_conversations
for select
to authenticated
using (public.is_chat_participant(id) or created_by = auth.uid());

drop policy if exists "chat_conversations_insert_own" on public.chat_conversations;
create policy "chat_conversations_insert_own"
on public.chat_conversations
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "chat_participants_select_visible" on public.chat_participants;
create policy "chat_participants_select_visible"
on public.chat_participants
for select
to authenticated
using (public.is_chat_participant(conversation_id));

drop policy if exists "chat_participants_insert_creator_only" on public.chat_participants;
create policy "chat_participants_insert_creator_only"
on public.chat_participants
for insert
to authenticated
with check (
  exists (
    select 1
    from public.chat_conversations c
    where c.id = conversation_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "chat_messages_select_participant" on public.chat_messages;
create policy "chat_messages_select_participant"
on public.chat_messages
for select
to authenticated
using (public.is_chat_participant(conversation_id));

drop policy if exists "chat_messages_insert_sender_participant" on public.chat_messages;
create policy "chat_messages_insert_sender_participant"
on public.chat_messages
for insert
to authenticated
with check (sender_id = auth.uid() and public.is_chat_participant(conversation_id));

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own"
on public.chat_messages
for delete
to authenticated
using (sender_id = auth.uid() and public.is_chat_participant(conversation_id));

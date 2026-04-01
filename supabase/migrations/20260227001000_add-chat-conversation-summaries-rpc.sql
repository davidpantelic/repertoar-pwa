create or replace function public.get_chat_conversation_summaries()
returns table (
  conversation_id uuid,
  other_user_id uuid,
  other_display_name text,
  other_email text,
  other_avatar_url text,
  last_message_body text,
  last_message_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  )
  select
    c.id as conversation_id,
    other_participant.user_id as other_user_id,
    coalesce(p.display_name, p.email, 'User') as other_display_name,
    p.email as other_email,
    p.avatar_url as other_avatar_url,
    last_message.body as last_message_body,
    last_message.created_at as last_message_at
  from me
  join public.chat_participants self_participant
    on self_participant.user_id = me.uid
  join public.chat_conversations c
    on c.id = self_participant.conversation_id
  join lateral (
    select p2.user_id
    from public.chat_participants p2
    where p2.conversation_id = c.id
      and p2.user_id <> me.uid
    order by p2.joined_at asc
    limit 1
  ) as other_participant on true
  left join public.profiles p
    on p.id = other_participant.user_id
  left join lateral (
    select m.body, m.created_at
    from public.chat_messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as last_message on true
  where last_message.created_at is not null
     or c.created_by = me.uid
  order by coalesce(last_message.created_at, c.created_at) desc;
$$;

grant execute on function public.get_chat_conversation_summaries() to authenticated;

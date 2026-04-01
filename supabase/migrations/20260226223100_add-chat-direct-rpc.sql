create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id is null then
    raise exception 'other_user_id is required';
  end if;

  if other_user_id = me then
    raise exception 'Cannot create conversation with yourself';
  end if;

  select p.conversation_id
  into conv_id
  from public.chat_participants p
  where p.user_id in (me, other_user_id)
  group by p.conversation_id
  having count(distinct p.user_id) = 2
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.chat_conversations (created_by)
  values (me)
  returning id into conv_id;

  insert into public.chat_participants (conversation_id, user_id)
  values
    (conv_id, me),
    (conv_id, other_user_id)
  on conflict do nothing;

  return conv_id;
end;
$$;

grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

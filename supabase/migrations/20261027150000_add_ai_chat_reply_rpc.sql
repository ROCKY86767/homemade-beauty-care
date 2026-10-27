create or replace function public.send_guest_ai_chat_message(
  p_visitor_token text,
  p_conversation_id uuid,
  p_message text
)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_conversation public.chat_conversations;
  v_message public.chat_messages;
begin
  if length(trim(coalesce(p_visitor_token, ''))) < 20 then
    raise exception 'Invalid visitor token';
  end if;

  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception 'AI message is empty';
  end if;

  select * into v_conversation
  from public.chat_conversations
  where id = p_conversation_id
    and visitor_token = p_visitor_token
    and status = 'open'
  for update;

  if not found then
    raise exception 'Chat is closed or not found';
  end if;

  insert into public.chat_messages (
    conversation_id, sender_type, sender_name, message, is_read, message_type, media_url
  )
  values (
    p_conversation_id, 'admin', 'AI Assistant', trim(p_message), true, 'text', null
  )
  returning * into v_message;

  update public.chat_conversations
  set last_message_at = now(),
      updated_at = now()
  where id = p_conversation_id;

  return v_message;
end;
$function$;

revoke all on function public.send_guest_ai_chat_message(text, uuid, text) from public;
grant execute on function public.send_guest_ai_chat_message(text, uuid, text) to anon, authenticated;

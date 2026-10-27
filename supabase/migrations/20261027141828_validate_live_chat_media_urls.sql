create or replace function public.send_guest_chat_media(
  p_visitor_token text,
  p_conversation_id uuid,
  p_media_url text,
  p_message_type text,
  p_message text default ''
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
  if p_message_type not in ('image', 'video') then
    raise exception 'Unsupported media type';
  end if;
  if p_media_url is null or p_media_url not like 'https://ccowyndqzlkpilygpepx.supabase.co/storage/v1/object/public/chat-audio/%' then
    raise exception 'Invalid chat media URL';
  end if;

  select * into v_conversation
  from public.chat_conversations
  where id = p_conversation_id and visitor_token = p_visitor_token and status = 'open'
  for update;
  if not found then raise exception 'Chat is closed or not found'; end if;

  insert into public.chat_messages (conversation_id, sender_type, sender_name, message, is_read, message_type, media_url)
  values (p_conversation_id, 'customer', v_conversation.customer_name,
    coalesce(nullif(trim(p_message), ''), case when p_message_type = 'video' then 'Video' else 'Image' end),
    false, p_message_type, p_media_url)
  returning * into v_message;

  update public.chat_conversations
  set last_message_at = now(), updated_at = now(), customer_last_seen_at = now()
  where id = p_conversation_id;
  return v_message;
end;
$function$;
revoke all on function public.send_guest_chat_media(text, uuid, text, text, text) from public;
grant execute on function public.send_guest_chat_media(text, uuid, text, text, text) to anon, authenticated;
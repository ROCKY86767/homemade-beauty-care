alter table public.chat_conversations
  add column if not exists customer_last_seen_at timestamptz;

create index if not exists chat_conversations_customer_last_seen_idx
  on public.chat_conversations (customer_last_seen_at desc);

create or replace function public.touch_guest_chat(
  p_visitor_token text,
  p_conversation_id uuid,
  p_current_path text default '/'
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_conversation public.chat_conversations;
begin
  if length(trim(coalesce(p_visitor_token, ''))) < 20 then
    raise exception 'Invalid visitor token';
  end if;

  update public.chat_conversations
  set customer_last_seen_at = now(),
      updated_at = now()
  where id = p_conversation_id
    and visitor_token = p_visitor_token
    and status = 'open'
  returning * into v_conversation;

  if not found then
    raise exception 'Conversation is closed or not found';
  end if;

  return v_conversation;
end;
$function$;

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

  if p_media_url is null or length(trim(p_media_url)) = 0 then
    raise exception 'Media URL is required';
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
    p_conversation_id, 'customer', v_conversation.customer_name,
    coalesce(nullif(trim(p_message), ''), case when p_message_type = 'video' then 'Video' else 'Image' end),
    false, p_message_type, p_media_url
  )
  returning * into v_message;

  update public.chat_conversations
  set last_message_at = now(),
      updated_at = now(),
      customer_last_seen_at = now()
  where id = p_conversation_id;

  return v_message;
end;
$function$;

grant execute on function public.touch_guest_chat(text, uuid, text) to anon, authenticated;
grant execute on function public.send_guest_chat_media(text, uuid, text, text, text) to anon, authenticated;
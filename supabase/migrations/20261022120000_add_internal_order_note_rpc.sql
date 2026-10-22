create or replace function public.add_internal_order_note(p_order_id uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_uid uuid := auth.uid();
  v_author text;
  v_role text;
  v_notes jsonb;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if v_uid is null then
    raise exception 'You must be signed in to add an internal note.';
  end if;
  if v_text = '' then
    raise exception 'Note cannot be empty.';
  end if;
  if length(v_text) > 5000 then
    raise exception 'Note must be 5000 characters or less.';
  end if;

  if exists (select 1 from public.admin_users where user_id = v_uid) then
    v_author := 'Admin';
    v_role := 'Admin';
  else
    select nullif(btrim(display_name), '')
      into v_author
      from public.moderator_users
      where user_id = v_uid and is_active = true;

    if not found then
      raise exception 'Only an active admin or moderator can add an internal note.';
    end if;

    v_author := coalesce(v_author, (select email from public.moderator_users where user_id = v_uid), 'Moderator');
    v_role := 'Moderator';
  end if;

  update public.orders
    set internal_order_notes =
      (case when jsonb_typeof(internal_order_notes) = 'array'
        then internal_order_notes else '[]'::jsonb end)
      || jsonb_build_array(jsonb_build_object(
        'text', v_text,
        'created_at', now(),
        'author', v_author,
        'role', v_role
      )),
      updated_at = now()
    where id = p_order_id
    returning internal_order_notes into v_notes;

  if not found then
    raise exception 'Order not found.';
  end if;

  return v_notes;
end;
$function$;

revoke all on function public.add_internal_order_note(uuid, text) from public;
grant execute on function public.add_internal_order_note(uuid, text) to authenticated;

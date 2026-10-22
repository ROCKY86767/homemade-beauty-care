create or replace function public.delete_internal_order_note(
  p_order_id uuid,
  p_note_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notes jsonb;
  v_next_notes jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not exists (select 1 from public.admin_users au where au.user_id = auth.uid()) then
    raise exception 'Only admins can delete internal order notes';
  end if;
  if p_note_index is null or p_note_index < 0 then
    raise exception 'Invalid note index';
  end if;
  select coalesce(o.internal_order_notes, '[]'::jsonb) into v_notes
    from public.orders o where o.id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if jsonb_typeof(v_notes) <> 'array' or p_note_index >= jsonb_array_length(v_notes) then
    raise exception 'Internal note not found';
  end if;
  select coalesce(jsonb_agg(item.value order by item.ordinality), '[]'::jsonb) into v_next_notes
    from jsonb_array_elements(v_notes) with ordinality as item(value, ordinality)
   where item.ordinality <> p_note_index + 1;
  update public.orders set internal_order_notes = v_next_notes, updated_at = now() where id = p_order_id;
  return v_next_notes;
end;
$$;
revoke all on function public.delete_internal_order_note(uuid, integer) from public;
grant execute on function public.delete_internal_order_note(uuid, integer) to authenticated;
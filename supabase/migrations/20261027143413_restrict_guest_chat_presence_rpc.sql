revoke all on function public.touch_guest_chat(text, uuid, text) from public;
grant execute on function public.touch_guest_chat(text, uuid, text) to anon, authenticated;

-- Trigger-only function: not callable via the REST RPC endpoint.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

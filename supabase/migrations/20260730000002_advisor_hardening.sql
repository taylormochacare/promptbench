-- Advisor hardening, after applying #1 to the live project (2026-07-30).
-- Fixes every warning the Security Advisor raised; #1 is applied and
-- therefore frozen — schema changes land as new migrations from here on.

-- splinter: function_search_path_mutable ×4. Pin search_path so a
-- malicious schema earlier in a caller's path can't shadow the tables
-- these functions touch. `public` (not '') keeps the unqualified table
-- references in #1 working; auth.uid() is schema-qualified already.
alter function set_updated_at() set search_path = public;
alter function prompt_runs_derive_page_id() set search_path = public;
alter function commit_prompt_version(uuid, text, jsonb, integer, text, text, boolean)
  set search_path = public;
alter function set_best_run(uuid) set search_path = public;

-- splinter: SECURITY DEFINER callable by public/signed-in ×2, both about
-- rls_auto_enable() — the event-trigger helper the dashboard created for
-- "Enable automatic RLS" at project creation. The event trigger runs as
-- owner and keeps working; nothing should be able to call it through the
-- Data API.
revoke execute on function public.rls_auto_enable()
  from public, anon, authenticated;

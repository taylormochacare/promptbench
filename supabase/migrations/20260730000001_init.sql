-- promptbench schema — migration #1 (init).
-- Decisions: docs/design-direction.md §7 + the 2026-07-29 architecture tree.
--
-- Shape summary:
--   one tree of typed pages; content is a JSONB blob for doc/canvas/mermaid
--   and a working draft for prompt pages; the workbench is relational
--   (prompt_versions immutable, prompt_runs terminal-state-only).
--   Single-player: RLS is indexed user_id equality; workspace_id is an
--   unused seam so multi-tenancy is a backfill, not a rebuild.
--   release_labels: CUT from v1 — deploy is a git commit via file binding;
--   labels return only if a runtime consumer ever exists.
--
-- Content-blob migrations are TypeScript-side (per-type migrate-on-load,
-- keyed by the schema_version columns here). This file is SQL migration #1;
-- the TS content-migration module ships its identity migration #1 same day.

-- ── repos: file-binding registry (synced; machine-local roots live in the
-- local session store, never here) ──────────────────────────────────────
create table repos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ── pages: the tree ─────────────────────────────────────────────────────
create table pages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  workspace_id   uuid,          -- deliberately unused in v1; no FK yet
  parent_id      uuid references pages (id) on delete cascade,
  type           text not null check (type in ('doc', 'canvas', 'mermaid', 'prompt')),
  title          text not null default '',
  position       double precision not null default 0,  -- fractional sibling order
  content        jsonb,         -- blob (doc/canvas/mermaid) or working draft (prompt)
  schema_version integer not null default 1,
  -- file binding (prompt pages; null = unbound scratch page)
  repo_id        uuid references repos (id) on delete set null,
  rel_path       text,
  bound_hash     text,          -- content hash at last read/write; never mtime
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz    -- soft delete: trash with restore, hard-delete later
);

-- Tree index store loads (id, parent_id, title, type, position) whole at launch.
create index pages_tree_idx on pages (user_id, parent_id, position)
  where deleted_at is null;

-- ── page_versions: prunable history (doc/canvas/mermaid only) ───────────
-- Retention: all for 24h, hourly for a week, daily for a month, pins forever.
-- Enforced app-side at save time (pg_cron is a later option, not a dependency).
create table page_versions (
  id             uuid primary key default gen_random_uuid(),
  page_id        uuid not null references pages (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  content        jsonb not null,           -- full snapshot, never a delta
  schema_version integer not null,         -- restore = migrate(load(row)), never raw
  kind           text not null default 'auto' check (kind in ('auto', 'pin')),
  pin_label      text,
  created_at     timestamptz not null default now()
);

create index page_versions_history_idx on page_versions (page_id, created_at desc);

-- ── prompt_versions: immutable, permanent, addressable ──────────────────
-- Never pruned (runs reference them). The well's draft commits into a row
-- here; run-on-dirty auto-commits so no run ever references a phantom state.
create table prompt_versions (
  id             uuid primary key default gen_random_uuid(),
  page_id        uuid not null references pages (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  number         integer not null,         -- v1, v2, … per page
  message        text not null default '', -- commit message; backfillable
  content        jsonb not null,           -- prompt text + model config + variable schema
  schema_version integer not null,
  -- file-binding provenance: which code-state this experiment ran against
  bound_hash     text,
  git_head       text,
  git_dirty      boolean,
  created_at     timestamptz not null default now(),
  unique (page_id, number)
);

-- ── prompt_runs: terminal states only ───────────────────────────────────
-- No 'running' status by design: rows are written once, on completion —
-- streaming partials live in the client session layer. cost_usd is computed
-- at write time from the provider pricing table and never recomputed.
create table prompt_runs (
  id            uuid primary key default gen_random_uuid(),
  version_id    uuid not null references prompt_versions (id) on delete cascade,
  page_id       uuid not null references pages (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  batch_id      uuid not null,             -- one Run All = one batch = one history row
  source        text not null default 'user' check (source in ('user', 'assist')),
  transport     text not null check (transport in ('http_stream', 'local_cli')),
  provider      text not null,             -- 'anthropic' | 'openai' | 'codex-cli' | …
  model         text not null,
  params        jsonb not null default '{}',
  status        text not null check (status in ('done', 'cancelled', 'error', 'timeout')),
  output        text,                      -- cancelled keeps the partial
  error_code    text,                      -- 'auth'|'rate_limit'|'usage_limit'|'timeout'|'provider'|'transport'
  error_message text,
  retry_after   text,                      -- usage_limit reset time (codex UX)
  tokens_in     integer,                   -- null renders as "—", never 0
  tokens_out    integer,
  cost_usd      numeric(12, 6),
  latency_ms    integer,
  starred       boolean not null default false,
  is_best       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index prompt_runs_by_version_idx on prompt_runs (version_id, created_at desc);
create index prompt_runs_by_batch_idx on prompt_runs (batch_id);
create index prompt_runs_analytics_idx on prompt_runs (user_id, model, created_at desc);
-- "Best" is per-version singular — enforced, not conventioned.
create unique index prompt_runs_one_best_per_version on prompt_runs (version_id)
  where is_best;

-- prompt_runs.page_id is denormalized off version_id for cheap listing.
-- Derive it on write so it can never disagree with the version's page —
-- a wrong client value is overwritten, not trusted, not asserted-against.
create or replace function prompt_runs_derive_page_id()
returns trigger language plpgsql as $$
begin
  select page_id into strict new.page_id
    from prompt_versions where id = new.version_id;
  return new;
end $$;

create trigger prompt_runs_page_id_consistency
  before insert or update of version_id, page_id on prompt_runs
  for each row execute function prompt_runs_derive_page_id();

-- Version numbers are per-page sequential. Reading max(number)+1 in the app
-- races across concurrent sessions (two devices, same user); this RPC
-- serializes committers per page with an advisory xact lock and assigns the
-- number in the same transaction. Clients commit via RPC, never raw insert.
create or replace function commit_prompt_version(
  p_page_id uuid,
  p_message text,
  p_content jsonb,
  p_schema_version integer,
  p_bound_hash text default null,
  p_git_head text default null,
  p_git_dirty boolean default null
) returns prompt_versions
language plpgsql
security invoker
as $$
declare
  v prompt_versions;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_page_id::text, 0));
  insert into prompt_versions
      (page_id, user_id, number, message, content, schema_version,
       bound_hash, git_head, git_dirty)
  select p_page_id, (select auth.uid()), coalesce(max(number), 0) + 1,
         p_message, p_content, p_schema_version,
         p_bound_hash, p_git_head, p_git_dirty
    from prompt_versions
   where page_id = p_page_id
  returning * into v;
  return v;
end $$;

-- Promoting a best run must clear the incumbent first or the partial unique
-- index raises. This function owns that ordering in one transaction; clients
-- call it via RPC instead of flipping is_best directly. Runs with invoker
-- rights, so RLS still applies.
create or replace function set_best_run(run_id uuid)
returns void
language sql
security invoker
as $$
  update prompt_runs
     set is_best = false
   where is_best
     and id <> run_id
     and version_id = (select version_id from prompt_runs where id = run_id);
  update prompt_runs set is_best = true where id = run_id;
$$;

-- ── updated_at ──────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger pages_updated_at before update on pages
  for each row execute function set_updated_at();

-- ── RLS: single-player, indexed equality ────────────────────────────────
-- (select auth.uid()) form so the planner caches it as an InitPlan.
alter table repos enable row level security;
alter table pages enable row level security;
alter table page_versions enable row level security;
alter table prompt_versions enable row level security;
alter table prompt_runs enable row level security;

create policy repos_own on repos
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy pages_own on pages
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy page_versions_own on page_versions
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy prompt_versions_own on prompt_versions
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy prompt_runs_own on prompt_runs
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index repos_user_idx on repos (user_id);
create index pages_user_idx on pages (user_id);
create index page_versions_user_idx on page_versions (user_id);
create index prompt_versions_user_idx on prompt_versions (user_id);
create index prompt_runs_user_idx on prompt_runs (user_id);

-- ── Grants: explicit, because auto-expose is disabled ───────────────────
-- The project is created with "Automatically expose new tables" OFF
-- (Supabase's own recommendation), so Data API roles get nothing by
-- default. Access is granted table-by-table, to authenticated only —
-- anon deliberately gets no grants; promptbench has no anonymous surface.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  repos, pages, page_versions, prompt_versions, prompt_runs
  to authenticated;
grant execute on function
  set_best_run(uuid),
  commit_prompt_version(uuid, text, jsonb, integer, text, text, boolean)
  to authenticated;

-- Deferred, deliberately: search_text tsvector projection (palette content
-- search), page_links (backlinks), workspaces, release_labels.

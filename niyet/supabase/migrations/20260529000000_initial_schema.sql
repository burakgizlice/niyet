-- Block 16: initial schema for niyet.
--
-- Four tables (profiles, queue_items, chains, done_items), RLS enabled on each
-- immediately after creation, and four owner-scoped policies per table created
-- before any data operations. Idempotent (IF NOT EXISTS guards) so it is safe
-- to re-run via the Supabase SQL editor or `apply_migration`.

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user. RLS is keyed on id = auth.uid()
-- because the primary key IS the user's auth id (no separate user_id column).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  show_count int2        NOT NULL DEFAULT 1
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (id = auth.uid());

-- ---------------------------------------------------------------------------
-- queue_items — the active task queue. position is 0-indexed ordering.
-- FK → profiles(id) guarantees a profile exists before any queue write.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text       text        NOT NULL,
  position   int4        NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queue_items_select" ON public.queue_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "queue_items_insert" ON public.queue_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "queue_items_update" ON public.queue_items
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "queue_items_delete" ON public.queue_items
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS queue_items_user_position_idx
  ON public.queue_items (user_id, position);

-- ---------------------------------------------------------------------------
-- chains — reusable step sequences. steps is a Postgres text array.
-- updated_at is maintained by a trigger and used by Block 18 as a merge
-- tiebreaker (created_at is immutable and cannot reflect mutations).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chains (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  emoji      text        NOT NULL DEFAULT '📋',
  steps      text[]      NOT NULL DEFAULT '{}',
  position   int4        NOT NULL DEFAULT 0,
  is_default boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chains_select" ON public.chains
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "chains_insert" ON public.chains
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "chains_update" ON public.chains
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "chains_delete" ON public.chains
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS chains_user_position_idx
  ON public.chains (user_id, position);

-- Keep updated_at current on every UPDATE. search_path is pinned (not
-- role-mutable) per the Supabase linter; this is a trigger-only function so
-- its EXECUTE grant is revoked from the API roles below.
CREATE OR REPLACE FUNCTION public.set_chains_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chains_set_updated_at ON public.chains;
CREATE TRIGGER chains_set_updated_at
  BEFORE UPDATE ON public.chains
  FOR EACH ROW EXECUTE FUNCTION public.set_chains_updated_at();

-- ---------------------------------------------------------------------------
-- done_items — completed task log. chain_id is nullable and uses
-- ON DELETE SET NULL so history survives chain deletion.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.done_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text         text        NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  chain_id     uuid        REFERENCES public.chains(id) ON DELETE SET NULL
);

ALTER TABLE public.done_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "done_items_select" ON public.done_items
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "done_items_insert" ON public.done_items
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "done_items_update" ON public.done_items
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "done_items_delete" ON public.done_items
  FOR DELETE USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- handle_new_user (C3) — auto-create a profiles row whenever a new auth.users
-- row is inserted. Eliminates the profile-creation race: Blocks 17/18 never
-- need to upsert profiles manually. SECURITY DEFINER because the trigger runs
-- as the inserting principal (the auth service), not the row owner, and needs
-- elevated rights to write public.profiles. ON CONFLICT DO NOTHING makes it
-- idempotent under edge-case replays.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, show_count)
  VALUES (NEW.id, 1)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Both functions fire only from triggers, never as PostgREST RPC. Revoke the
-- default PUBLIC EXECUTE grant so neither is callable via /rest/v1/rpc/* by the
-- anon or authenticated roles (the triggers still fire — they run as the table
-- owner, not via these grants).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_chains_updated_at() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Front Door — initial schema
-- Run this in the Supabase SQL editor or via `npx supabase db push`
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── Tables ───────────────────────────────────────────────────

-- One row per user. id matches auth.users.id.
-- Role is set at signup via user metadata (raw_user_meta_data->>'role').
CREATE TABLE public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('agent', 'buyer', 'renter')),
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extra data for agent accounts.
-- is_active is set manually by admin — agents are onboarded offline.
CREATE TABLE public.agents (
  id          UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_name TEXT        NOT NULL,
  areas       TEXT[]      NOT NULL DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ID and financial verification state for buyers/renters.
CREATE TABLE public.verifications (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'in_progress', 'verified', 'failed')),
  id_check_result  TEXT,
  income_verified  BOOLEAN     NOT NULL DEFAULT false,
  docs_url         TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Current intent score per buyer/renter. One row per profile (upserted on recompute).
CREATE TABLE public.intent_scores (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score       INTEGER     NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  signals     JSONB       NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id)
);

-- One row per user per calendar day. Used to compute activity streaks and decay.
CREATE TABLE public.activity_log (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        DATE    NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (profile_id, date)
);

-- A buyer/renter knocks on a property. Agent has 2 hours to confirm.
CREATE TABLE public.knocks (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_address  TEXT        NOT NULL,
  property_postcode TEXT        NOT NULL,
  agent_id          UUID        NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'confirmed', 'expired')),
  knocked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  confirmed_at      TIMESTAMPTZ
);

-- Viewing outcome, recorded 5 days after a confirmed knock.
-- One outcome per knock (first response wins).
CREATE TABLE public.viewings (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  knock_id   UUID        NOT NULL REFERENCES public.knocks(id) ON DELETE CASCADE,
  outcome    TEXT        NOT NULL CHECK (outcome IN ('booked', 'attended', 'no_action')),
  outcome_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (knock_id)
);

-- Agent unlocks a buyer/renter's full contact details.
CREATE TABLE public.leads (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id      UUID        NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_range   TEXT,
  move_date     DATE,
  postcode_area TEXT,
  UNIQUE (profile_id, agent_id)
);


-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX ON public.verifications (profile_id);
CREATE INDEX ON public.intent_scores (profile_id);
CREATE INDEX ON public.activity_log  (profile_id, date);
CREATE INDEX ON public.knocks        (profile_id);
CREATE INDEX ON public.knocks        (agent_id);
CREATE INDEX ON public.knocks        (status, expires_at); -- used by the expiry cron job
CREATE INDEX ON public.viewings      (knock_id);
CREATE INDEX ON public.leads         (profile_id);
CREATE INDEX ON public.leads         (agent_id);


-- ── Triggers ─────────────────────────────────────────────────

-- Auto-create a profile row whenever a user signs up via Supabase Auth.
-- Role is passed in signUp({ options: { data: { role: 'agent' } } }).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'buyer')
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep verifications.updated_at current on every update.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER set_verifications_updated_at
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── Row-Level Security ────────────────────────────────────────

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intent_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads         ENABLE ROW LEVEL SECURITY;

-- profiles ────────────────────────────────────────────────────
-- The handle_new_user trigger runs as SECURITY DEFINER so INSERT is bypassed.
CREATE POLICY "profiles: owner can read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: owner can update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- agents ──────────────────────────────────────────────────────
-- Buyers can read basic agent info (name, areas) to direct a knock.
CREATE POLICY "agents: owner can read"
  ON public.agents FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "agents: buyers can read active agents"
  ON public.agents FOR SELECT
  USING (is_active = true);

CREATE POLICY "agents: owner can update"
  ON public.agents FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "agents: owner can insert"
  ON public.agents FOR INSERT
  WITH CHECK (auth.uid() = id);

-- verifications ───────────────────────────────────────────────
CREATE POLICY "verifications: owner can read"
  ON public.verifications FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "verifications: owner can insert"
  ON public.verifications FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Agents can view verifications for leads they have unlocked.
CREATE POLICY "verifications: agent can read unlocked"
  ON public.verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.profile_id = verifications.profile_id
        AND leads.agent_id   = auth.uid()
    )
  );

-- intent_scores ───────────────────────────────────────────────
CREATE POLICY "intent_scores: owner can read"
  ON public.intent_scores FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "intent_scores: agent can read unlocked"
  ON public.intent_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.profile_id = intent_scores.profile_id
        AND leads.agent_id   = auth.uid()
    )
  );

-- Agents can also see scores for buyers who have knocked on their properties.
CREATE POLICY "intent_scores: agent can read knockers"
  ON public.intent_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knocks
      WHERE knocks.profile_id = intent_scores.profile_id
        AND knocks.agent_id   = auth.uid()
    )
  );

-- activity_log ────────────────────────────────────────────────
CREATE POLICY "activity_log: owner can read"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "activity_log: owner can insert"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "activity_log: owner can update"
  ON public.activity_log FOR UPDATE
  USING (auth.uid() = profile_id);

-- knocks ──────────────────────────────────────────────────────
CREATE POLICY "knocks: buyer can read own"
  ON public.knocks FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "knocks: buyer can insert"
  ON public.knocks FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "knocks: agent can read directed to them"
  ON public.knocks FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "knocks: agent can confirm (update status)"
  ON public.knocks FOR UPDATE
  USING (auth.uid() = agent_id);

-- viewings ────────────────────────────────────────────────────
-- Both the buyer and the agent on the underlying knock can read and insert the outcome.
CREATE POLICY "viewings: parties can read"
  ON public.viewings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knocks
      WHERE knocks.id = viewings.knock_id
        AND (knocks.profile_id = auth.uid() OR knocks.agent_id = auth.uid())
    )
  );

CREATE POLICY "viewings: parties can insert outcome"
  ON public.viewings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.knocks
      WHERE knocks.id = knock_id
        AND (knocks.profile_id = auth.uid() OR knocks.agent_id = auth.uid())
    )
  );

-- leads ───────────────────────────────────────────────────────
CREATE POLICY "leads: buyer can read own"
  ON public.leads FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "leads: agent can read own"
  ON public.leads FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "leads: agent can unlock (insert)"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- ============================================================
-- Add full_name to profiles and buyer_preferences table
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN full_name TEXT;

-- Update the trigger to populate full_name from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'buyer'),
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$;

-- Buyer/renter stated preferences — set at signup, can be updated later
CREATE TABLE public.buyer_preferences (
  id             UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_area    TEXT,
  budget_range   TEXT,
  move_timeframe TEXT        CHECK (move_timeframe IN ('0-3', '3-6', '6+')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_buyer_preferences_updated_at
  BEFORE UPDATE ON public.buyer_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.buyer_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_preferences: owner can read"
  ON public.buyer_preferences FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "buyer_preferences: owner can insert"
  ON public.buyer_preferences FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "buyer_preferences: owner can update"
  ON public.buyer_preferences FOR UPDATE
  USING (auth.uid() = id);

-- Agents can see preferences for buyers who have knocked or been unlocked
CREATE POLICY "buyer_preferences: agent can read"
  ON public.buyer_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knocks
      WHERE knocks.profile_id = buyer_preferences.id
        AND knocks.agent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.profile_id = buyer_preferences.id
        AND leads.agent_id = auth.uid()
    )
  );

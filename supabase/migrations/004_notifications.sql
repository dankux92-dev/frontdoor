-- ============================================================
-- Migration 004: notifications table + knocks.needs_review
-- Run after 003_storage.sql
-- ============================================================

-- notifications table
CREATE TABLE public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  knock_id    UUID        REFERENCES public.knocks(id) ON DELETE SET NULL,
  message     TEXT        NOT NULL,
  read        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_profile_read_idx ON public.notifications(profile_id, read);
CREATE INDEX notifications_knock_id_idx     ON public.notifications(knock_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = profile_id);

-- needs_review flag on knocks (set when both parties give conflicting outcomes)
ALTER TABLE public.knocks ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT false;

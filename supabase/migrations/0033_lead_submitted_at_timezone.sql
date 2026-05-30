-- Track the exact moment a user clicked Submit, separate from created_at which
-- records when the draft was first created (i.e. when they started the form).
-- For leads that were never a draft, submitted_at = created_at (set by insertLead).
-- Falls back to created_at in the admin panel for rows where this is null.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS submitted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_timezone TEXT;

CREATE TABLE IF NOT EXISTS admin_portal_lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_jib text NOT NULL UNIQUE,
  lead_name text NOT NULL,
  note text,
  outreach_status text NOT NULL DEFAULT 'nije_kontaktiran',
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_portal_lead_notes_status
  ON admin_portal_lead_notes(outreach_status);

CREATE INDEX IF NOT EXISTS idx_admin_portal_lead_notes_next_follow_up
  ON admin_portal_lead_notes(next_follow_up_at);

ALTER TABLE admin_portal_lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage admin_portal_lead_notes"
  ON admin_portal_lead_notes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

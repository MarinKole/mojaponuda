-- ============================================================
-- Fix RLS policies: allow service role full access
-- Fix: scraper inserts were blocked by missing INSERT policies
-- ============================================================

-- Service role bypass for opportunities (scraper writes)
CREATE POLICY "Service role full access opportunities"
  ON opportunities FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Service role bypass for legal_updates
CREATE POLICY "Service role full access legal_updates"
  ON legal_updates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Service role bypass for scraper_log
CREATE POLICY "Service role full access scraper_log"
  ON scraper_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Also add content_hash column if not exists
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE INDEX IF NOT EXISTS idx_opportunities_content_hash ON opportunities(content_hash);

-- Add ai_content column for unified SEO article body (replaces separate description/requirements display)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_content text;

-- Add outcome to opportunity_follows for won/lost tracking
ALTER TABLE opportunity_follows ADD COLUMN IF NOT EXISTS outcome text CHECK (outcome IN ('won', 'lost'));

-- Index for faster follow lookups with outcome
CREATE INDEX IF NOT EXISTS idx_opportunity_follows_outcome ON opportunity_follows(user_id, outcome);

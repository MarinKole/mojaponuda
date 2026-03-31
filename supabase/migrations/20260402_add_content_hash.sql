-- Add content_hash column for change detection
-- This column stores SHA-256 hash of opportunity content to detect changes

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS content_hash text;

CREATE INDEX IF NOT EXISTS idx_opportunities_content_hash ON opportunities(content_hash);

-- Add comment for documentation
COMMENT ON COLUMN opportunities.content_hash IS 'SHA-256 hash of opportunity content for change detection (title + description + requirements + deadline)';

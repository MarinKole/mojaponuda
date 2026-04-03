-- Tender documentation uploads for bid preparation
-- Each bid can have one tender documentation file uploaded
CREATE TABLE IF NOT EXISTS tender_doc_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  content_type text,
  extracted_text text,
  ai_analysis jsonb,
  page_count integer,
  status text NOT NULL DEFAULT 'uploading',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Index for quick lookup by bid_id
CREATE INDEX IF NOT EXISTS idx_tender_doc_uploads_bid_id ON tender_doc_uploads(bid_id);

-- RLS
ALTER TABLE tender_doc_uploads ENABLE ROW LEVEL SECURITY;

-- Users can see tender docs for their own bids
CREATE POLICY "Users can view own tender docs"
  ON tender_doc_uploads FOR SELECT
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN companies c ON b.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Users can insert tender docs for their own bids
CREATE POLICY "Users can upload tender docs"
  ON tender_doc_uploads FOR INSERT
  WITH CHECK (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN companies c ON b.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Users can update own tender docs
CREATE POLICY "Users can update own tender docs"
  ON tender_doc_uploads FOR UPDATE
  USING (
    bid_id IN (
      SELECT b.id FROM bids b
      JOIN companies c ON b.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role full access to tender docs"
  ON tender_doc_uploads FOR ALL
  USING (auth.role() = 'service_role');

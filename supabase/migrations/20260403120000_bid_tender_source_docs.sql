-- Izvorna tenderska dokumentacija po ponudi + citat/stranica na checklist stavkama

CREATE TABLE IF NOT EXISTS bid_tender_source_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id        uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          text NOT NULL,
  file_path     text NOT NULL,
  mime_type     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bid_tender_source_documents_bid_id ON bid_tender_source_documents(bid_id);

ALTER TABLE bid_checklist_items
  ADD COLUMN IF NOT EXISTS tender_source_document_id uuid REFERENCES bid_tender_source_documents(id) ON DELETE SET NULL;
ALTER TABLE bid_checklist_items
  ADD COLUMN IF NOT EXISTS source_page integer;
ALTER TABLE bid_checklist_items
  ADD COLUMN IF NOT EXISTS source_quote text;
ALTER TABLE bid_checklist_items
  ADD COLUMN IF NOT EXISTS source_highlight_regions jsonb;

ALTER TABLE bid_tender_source_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bid_tender_source_documents"
  ON bid_tender_source_documents FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own bid_tender_source_documents"
  ON bid_tender_source_documents FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own bid_tender_source_documents"
  ON bid_tender_source_documents FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Add document_type to bid_checklist_items for better vault matching
ALTER TABLE bid_checklist_items ADD COLUMN IF NOT EXISTS document_type text;

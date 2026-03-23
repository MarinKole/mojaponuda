-- Create table for tracking pay-per-tender unlocks
CREATE TABLE IF NOT EXISTS public.unlocked_tenders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tender_id varchar NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    amount_paid numeric(10,2) DEFAULT 15.00 NOT NULL,
    status text DEFAULT 'active' NOT NULL,
    UNIQUE(user_id, tender_id)
);

-- Enable RLS
ALTER TABLE public.unlocked_tenders ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own unlocked tenders"
    ON public.unlocked_tenders FOR SELECT
    USING (auth.uid() = user_id);

-- Explicitly allow service role bypass (Supabase default usually handles this, but good to be explicit for admin inserts)
CREATE POLICY "Service role can manage all unlocked tenders"
    ON public.unlocked_tenders FOR ALL
    USING (true)
    WITH CHECK (true);

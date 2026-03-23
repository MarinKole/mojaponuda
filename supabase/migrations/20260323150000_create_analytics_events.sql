-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own events
CREATE POLICY "Users can insert their own events"
    ON public.analytics_events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all events
CREATE POLICY "Admins can view all events"
    ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt()->>'email' IN (
            SELECT unnest(string_to_array(COALESCE(current_setting('app.admin_emails', true), ''), ','))
        )
    );

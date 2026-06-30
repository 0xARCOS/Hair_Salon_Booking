CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own tokens
CREATE POLICY "Users can read own push tokens"
    ON public.push_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own tokens
CREATE POLICY "Users can insert own push tokens"
    ON public.push_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own tokens
CREATE POLICY "Users can delete own push tokens"
    ON public.push_tokens
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add to supabase realtime if needed (optional)
-- alter publication supabase_realtime add table push_tokens;

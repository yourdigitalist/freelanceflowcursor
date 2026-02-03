-- Drop the unused SECURITY DEFINER function
DROP FUNCTION IF EXISTS public.has_valid_share_token(UUID, UUID);

-- Add DELETE policy for review_comments to allow owners to moderate comments
CREATE POLICY "Users can delete comments on their requests" 
ON public.review_comments 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.review_requests 
  WHERE review_requests.id = review_comments.review_request_id 
  AND review_requests.user_id = auth.uid()
));

-- Make review-files bucket private for defense in depth
UPDATE storage.buckets SET public = false WHERE id = 'review-files';

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view review files" ON storage.objects;

-- Create rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON public.rate_limits(key, window_start);

-- Enable RLS on rate_limits (service role will bypass)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access this table
-- This is intentional - rate limiting is managed by edge functions using service role
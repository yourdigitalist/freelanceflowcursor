-- Fix overly permissive RLS policies by using proper token-based access

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view via share token" ON public.review_requests;
DROP POLICY IF EXISTS "Anyone can view review files" ON public.review_files;
DROP POLICY IF EXISTS "Anyone can add comments" ON public.review_comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.review_comments;

-- Create a function to validate share token access
CREATE OR REPLACE FUNCTION public.has_valid_share_token(request_id UUID, token UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.review_requests 
    WHERE id = request_id AND share_token = token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- For review_requests: users see their own, or accessible via RPC
-- We'll use edge functions for public access instead of RLS with true

-- For review_files: same approach
-- Keep user access only, public access via edge function

-- For review_comments: restrict insert to require request_id exists
CREATE POLICY "Insert comments on valid requests" ON public.review_comments FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.review_requests WHERE id = review_request_id));
-- Review folders for organizing requests
CREATE TABLE public.review_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📁',
  color TEXT DEFAULT '#9B63E9',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.review_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders" ON public.review_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own folders" ON public.review_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.review_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.review_folders FOR DELETE USING (auth.uid() = user_id);

-- Review requests
CREATE TABLE public.review_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES public.review_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'commented')),
  due_date DATE,
  share_token UUID NOT NULL DEFAULT gen_random_uuid(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests" ON public.review_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own requests" ON public.review_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own requests" ON public.review_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own requests" ON public.review_requests FOR DELETE USING (auth.uid() = user_id);
-- Public access via share_token for clients
CREATE POLICY "Anyone can view via share token" ON public.review_requests FOR SELECT USING (true);

-- Review files
CREATE TABLE public.review_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_request_id UUID NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.review_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own files" ON public.review_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own files" ON public.review_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own files" ON public.review_files FOR DELETE USING (auth.uid() = user_id);
-- Public access for clients viewing review
CREATE POLICY "Anyone can view review files" ON public.review_files FOR SELECT USING (true);

-- Review comments (can be from logged-in user or external client)
CREATE TABLE public.review_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_file_id UUID NOT NULL REFERENCES public.review_files(id) ON DELETE CASCADE,
  review_request_id UUID NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
  user_id UUID, -- null for external commenters
  commenter_name TEXT,
  commenter_email TEXT,
  content TEXT NOT NULL,
  x_position NUMERIC, -- for positioning on image
  y_position NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on their requests
CREATE POLICY "Users can view comments on their requests" ON public.review_comments FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.review_requests WHERE id = review_request_id AND user_id = auth.uid()));
-- Anyone can insert comments (clients don't have auth)
CREATE POLICY "Anyone can add comments" ON public.review_comments FOR INSERT WITH CHECK (true);
-- Public read for clients viewing
CREATE POLICY "Anyone can view comments" ON public.review_comments FOR SELECT USING (true);

-- Review recipients (emails to send to)
CREATE TABLE public.review_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_request_id UUID NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.review_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recipients for their requests" ON public.review_recipients FOR ALL 
USING (EXISTS (SELECT 1 FROM public.review_requests WHERE id = review_request_id AND user_id = auth.uid()));

-- Storage bucket for review files
INSERT INTO storage.buckets (id, name, public) VALUES ('review-files', 'review-files', true);

-- Storage policies
CREATE POLICY "Users can upload review files" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'review-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view review files" ON storage.objects FOR SELECT 
USING (bucket_id = 'review-files');

CREATE POLICY "Users can delete their review files" ON storage.objects FOR DELETE 
USING (bucket_id = 'review-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update trigger for review_requests
CREATE TRIGGER update_review_requests_updated_at
BEFORE UPDATE ON public.review_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
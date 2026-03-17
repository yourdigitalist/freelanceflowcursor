-- Note folders for organizing notes (same pattern as review_folders)
CREATE TABLE IF NOT EXISTS public.note_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📁',
  color TEXT DEFAULT '#9B63E9',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note folders" ON public.note_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own note folders" ON public.note_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own note folders" ON public.note_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own note folders" ON public.note_folders FOR DELETE USING (auth.uid() = user_id);

-- Add folder_id to notes
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL;

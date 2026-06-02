-- Global note tag catalog per user
CREATE TABLE IF NOT EXISTS public.note_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note tags" ON public.note_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own note tags" ON public.note_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own note tags" ON public.note_tags FOR DELETE USING (auth.uid() = user_id);

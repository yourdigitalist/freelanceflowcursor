-- Create project_statuses table for customizable task statuses per project
CREATE TABLE public.project_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  is_done_status BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_comments table for comments on tasks
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add status_id column to tasks table to reference project_statuses
ALTER TABLE public.tasks ADD COLUMN status_id UUID REFERENCES public.project_statuses(id) ON DELETE SET NULL;

-- Enable RLS on project_statuses
ALTER TABLE public.project_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own project statuses"
ON public.project_statuses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own project statuses"
ON public.project_statuses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project statuses"
ON public.project_statuses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project statuses"
ON public.project_statuses
FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their tasks"
ON public.task_comments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.tasks
  WHERE tasks.id = task_comments.task_id AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can insert comments on their tasks"
ON public.task_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.tasks
  WHERE tasks.id = task_comments.task_id AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can update their own comments"
ON public.task_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.task_comments
FOR DELETE
USING (auth.uid() = user_id);
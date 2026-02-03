-- Add icon customization columns to projects table
ALTER TABLE public.projects
ADD COLUMN icon_emoji TEXT DEFAULT '📁',
ADD COLUMN icon_color TEXT DEFAULT '#9B63E9';
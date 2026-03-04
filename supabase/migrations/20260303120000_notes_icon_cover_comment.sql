-- Add icon, cover, and comment to notes

alter table public.notes
  add column if not exists icon_emoji text,
  add column if not exists cover_color text,
  add column if not exists note_comment text;

comment on column public.notes.icon_emoji is 'Emoji shown as note icon (e.g. 📝)';
comment on column public.notes.cover_color is 'Hex color for note cover bar (e.g. #e0e0e0)';
comment on column public.notes.note_comment is 'Optional comment or note-to-self for the note';

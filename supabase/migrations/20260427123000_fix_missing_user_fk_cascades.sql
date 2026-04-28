-- Ensure user-owned tables cascade when auth user is deleted
DO $$
DECLARE
  target_table text;
  constraint_name text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'review_folders',
    'review_requests',
    'review_files',
    'project_statuses',
    'task_comments',
    'taxes',
    'note_folders'
  ]
  LOOP
    -- Clean up legacy orphan rows before adding FK constraints.
    EXECUTE format(
      'DELETE FROM public.%I t WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)',
      target_table
    );

    -- Remove existing user_id FK to auth.users (if present) so we can re-create with CASCADE.
    FOR constraint_name IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
      JOIN pg_class rt ON rt.oid = c.confrelid
      JOIN pg_namespace rn ON rn.oid = rt.relnamespace
      WHERE c.contype = 'f'
        AND n.nspname = 'public'
        AND t.relname = target_table
        AND a.attname = 'user_id'
        AND rn.nspname = 'auth'
        AND rt.relname = 'users'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', target_table, constraint_name);
    END LOOP;

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
      target_table,
      target_table || '_user_id_fkey'
    );
  END LOOP;
END
$$;

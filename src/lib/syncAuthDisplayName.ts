import { supabase } from '@/integrations/supabase/client';

/** Keep Supabase Auth dashboard display name in sync with profiles. */
export async function syncAuthDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
}): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: input.fullName,
      first_name: input.firstName,
      last_name: input.lastName,
    },
  });
  if (error) {
    console.warn('Failed to sync auth display name:', error.message);
  }
}

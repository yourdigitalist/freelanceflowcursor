import { supabase } from '@/integrations/supabase/client';

interface ResolveEffectiveHourlyRateArgs {
  userId: string;
  projectId?: string | null;
}

export async function resolveEffectiveHourlyRate({
  userId,
  projectId,
}: ResolveEffectiveHourlyRateArgs): Promise<number | null> {
  const [projectResult, profileResult] = await Promise.all([
    projectId
      ? supabase
          .from('projects')
          .select('hourly_rate')
          .eq('id', projectId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('profiles').select('hourly_rate').eq('user_id', userId).maybeSingle(),
  ]);

  if (projectResult.data?.hourly_rate != null) return Number(projectResult.data.hourly_rate);
  if (profileResult.data?.hourly_rate != null) return Number(profileResult.data.hourly_rate);
  return null;
}

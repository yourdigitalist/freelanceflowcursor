import { useAuth } from '@/lib/auth';
import { useShellProfile } from '@/hooks/useShellProfile';
import { useAppFeatures } from '@/hooks/useAppFeatures';
import { canAccessByMode, getContractsAccessMode, getNotesAccessMode } from '@/lib/features';

export function useFeatureAccess() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useShellProfile(user?.id);
  const { data: features, isLoading: featuresLoading } = useAppFeatures();
  const isAdmin = profile?.is_admin === true;

  const resolvedFeatures = features ?? {
    notes: getNotesAccessMode(),
    contracts: getContractsAccessMode(),
    proposals2: 'off' as const,
  };

  return {
    isLoading: profileLoading || featuresLoading,
    isAdmin,
    features: resolvedFeatures,
    canAccessNotes: canAccessByMode(resolvedFeatures.notes, isAdmin),
    canAccessContracts: canAccessByMode(resolvedFeatures.contracts, isAdmin),
    canAccessProposals2: canAccessByMode(resolvedFeatures.proposals2, isAdmin),
  };
}

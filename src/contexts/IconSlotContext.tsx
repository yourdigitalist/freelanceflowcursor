import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  Table,
  Clock,
  Receipt,
  IrisScan,
  DollarSign,
  Bell,
  BookOpen,
  Lightbulb,
  MessageSquare,
  Megaphone,
  Mail,
  Palette,
  LayoutGrid,
  User,
  Building2,
  Globe,
  CreditCard,
  HardDrive,
  Briefcase,
  BarChart3,
  CheckCircle,
  Calendar,
  CheckSquare,
  Timer,
} from '@/components/icons';
import { supabase } from '@/integrations/supabase/client';
import type { IconSlotKey } from '@/lib/iconSlots';

type IconComponent = React.ComponentType<{ className?: string }>;

const DEFAULT_ICONS: Record<IconSlotKey, IconComponent> = {
  sidebar_dashboard: LayoutDashboard,
  sidebar_clients: Users,
  sidebar_projects: Table,
  sidebar_time: Clock,
  sidebar_invoices: Receipt,
  sidebar_reviews: IrisScan,
  stat_clients: Users,
  stat_projects: Table,
  stat_hours: Clock,
  stat_money: DollarSign,
  empty_invoices: Receipt,
  empty_projects: Table,
  empty_clients: Users,
  empty_time: Clock,
  empty_reviews: IrisScan,
  admin_overview: LayoutDashboard,
  admin_announcements: Megaphone,
  admin_comms: Mail,
  admin_branding: Palette,
  admin_icons: LayoutGrid,
  admin_help_content: BookOpen,
  admin_feature_requests: Lightbulb,
  admin_feedback: MessageSquare,
  settings_profile: User,
  settings_business: Building2,
  settings_locale: Globe,
  settings_invoices: Receipt,
  settings_notifications: Bell,
  settings_subscription: CreditCard,
  settings_storage: HardDrive,
  app_logo: Briefcase,
  auth_clock: Clock,
  auth_users: Users,
  auth_receipt: Receipt,
  auth_chart: BarChart3,
  auth_check: CheckCircle,
  onboarding_building: Building2,
  onboarding_user: User,
  onboarding_receipt: Receipt,
  onboarding_table: Table,
  onboarding_timer: Timer,
  task_clock: Clock,
  task_message: MessageSquare,
  task_calendar: Calendar,
  project_clock: Clock,
  project_dollar: DollarSign,
  project_calendar: Calendar,
  project_check: CheckSquare,
  invoice_receipt: Receipt,
  invoice_empty: Receipt,
  review_iris: IrisScan,
  nav_bell: Bell,
  help_book: BookOpen,
};

type Upload = { id: string; name: string; svg_content: string | null; storage_path: string | null };
type SlotAssignment = { slot_key: string; icon_upload_id: string | null; icon_storage_path: string | null };

export type SlotAssignmentValue = { uploadId: string | null; storagePath: string | null };

type ContextValue = {
  getIcon: (slot: IconSlotKey) => IconComponent;
  uploads: Upload[];
  assignments: Record<string, SlotAssignmentValue>;
  refetch: () => void;
};

const IconSlotContext = createContext<ContextValue | null>(null);

const ICON_SLOTS_QUERY_KEY = ['app_icon_slots'] as const;
const ICON_UPLOADS_QUERY_KEY = ['app_icon_uploads'] as const;
const BUCKET = 'app-icons';

/** Replace only actual colors with currentColor; keep fill="none" and stroke="none" so line icons stay outline */
function normalizeSvgForCurrentColor(innerSvg: string): string {
  return innerSvg
    .replace(/\bfill\s*=\s*["']([^"']*)["']/gi, (_, v) => (v.trim().toLowerCase() === 'none' ? `fill="${v}"` : 'fill="currentColor"'))
    .replace(/\bstroke\s*=\s*["']([^"']*)["']/gi, (_, v) => (v.trim().toLowerCase() === 'none' ? `stroke="${v}"` : 'stroke="currentColor"'));
}

function CustomSvgIcon({ svgContent, className }: { svgContent: string; className?: string }) {
  const inner = useMemo(() => {
    const match = svgContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    const innerContent = match ? match[1] : svgContent;
    return normalizeSvgForCurrentColor(innerContent);
  }, [svgContent]);
  const viewBox = useMemo(() => {
    const m = svgContent.match(/viewBox=["']([^"']+)["']/i);
    return m ? m[1] : '0 0 24 24';
  }, [svgContent]);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox={viewBox}
      className={className}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

function IconFromStoragePath({
  storagePath,
  className,
}: {
  storagePath: string;
  className?: string;
}) {
  const { data: svgContent, isLoading } = useQuery({
    queryKey: ['app_icon_svg', storagePath] as const,
    queryFn: async () => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      const res = await fetch(data.publicUrl);
      if (!res.ok) throw new Error('Failed to load icon');
      return res.text();
    },
    staleTime: 10 * 60 * 1000,
  });
  if (isLoading || !svgContent) return <span className={className} />;
  return <CustomSvgIcon svgContent={svgContent} className={className} />;
}

export function IconSlotProvider({ children }: { children: React.ReactNode }) {
  const { data: slotData, refetch: refetchSlots } = useQuery({
    queryKey: ICON_SLOTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_icon_slots')
        .select('slot_key, icon_upload_id, icon_storage_path');
      if (error) throw error;
      return (data ?? []) as SlotAssignment[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: uploadData, refetch: refetchUploads } = useQuery({
    queryKey: ICON_UPLOADS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('app_icon_uploads').select('id, name, svg_content, storage_path').order('name');
      if (error) throw error;
      return (data ?? []) as Upload[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const uploads = uploadData ?? [];
  const assignments = useMemo((): Record<string, SlotAssignmentValue> => {
    const map: Record<string, SlotAssignmentValue> = {};
    (slotData ?? []).forEach((r) => {
      map[r.slot_key] = {
        uploadId: r.icon_upload_id ?? null,
        storagePath: r.icon_storage_path ?? null,
      };
    });
    return map;
  }, [slotData]);

  const refetch = useMemo(() => () => {
    refetchSlots();
    refetchUploads();
  }, [refetchSlots, refetchUploads]);

  const uploadsById = useMemo(() => {
    const m: Record<string, Upload> = {};
    uploads.forEach((u) => (m[u.id] = u));
    return m;
  }, [uploads]);

  const getIcon = useMemo(() => {
    return (slot: IconSlotKey): IconComponent => {
      const assignment = assignments[slot];
      if (assignment?.storagePath) {
        const path = assignment.storagePath;
        return ({ className }) => <IconFromStoragePath storagePath={path} className={className} />;
      }
      const uploadId = assignment?.uploadId ?? null;
      const upload = uploadId ? uploadsById[uploadId] : null;
      if (upload?.svg_content) {
        const svg = upload.svg_content;
        return ({ className }) => <CustomSvgIcon svgContent={svg} className={className} />;
      }
      return DEFAULT_ICONS[slot];
    };
  }, [assignments, uploadsById]);

  const value: ContextValue = useMemo(
    () => ({ getIcon, uploads, assignments, refetch }),
    [getIcon, uploads, assignments, refetch]
  );

  return <IconSlotContext.Provider value={value}>{children}</IconSlotContext.Provider>;
}

export function useIconSlots(): ContextValue {
  const ctx = useContext(IconSlotContext);
  if (!ctx) {
    return {
      getIcon: (slot: IconSlotKey) => DEFAULT_ICONS[slot],
      uploads: [],
      assignments: {} as Record<string, SlotAssignmentValue>,
      refetch: () => {},
    };
  }
  return ctx;
}

export function SlotIcon({
  slot,
  className,
}: {
  slot: IconSlotKey;
  className?: string;
}) {
  const { getIcon } = useIconSlots();
  const Icon = getIcon(slot);
  return <Icon className={className} />;
}

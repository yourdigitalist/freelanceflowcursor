import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlotIcon } from '@/contexts/IconSlotContext';

const adminCards = [
  { path: '/admin/announcements', label: 'Announcements', slot: 'admin_announcements' as const, description: 'Manage in-app announcements' },
  { path: '/admin/comms', label: 'Comms & templates', slot: 'admin_comms' as const, description: 'Email and communication templates' },
  { path: '/admin/branding', label: 'Branding', slot: 'admin_branding' as const, description: 'Logo and brand colors' },
  { path: '/admin/icons', label: 'Icons', slot: 'admin_icons' as const, description: 'Upload and assign slot icons' },
  { path: '/admin/help-content', label: 'Help content', slot: 'admin_help_content' as const, description: 'Help center articles' },
  { path: '/admin/feature-requests', label: 'Feature requests', slot: 'admin_feature_requests' as const, description: 'View and manage feature requests' },
  { path: '/admin/feedback', label: 'Feedback', slot: 'admin_feedback' as const, description: 'User feedback' },
];

export default function AdminOverview() {
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">Manage app content, branding, and communications.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminCards.map(({ path, label, slot, description }) => (
            <Link key={path} to={path}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <SlotIcon slot={slot} className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
  );
}

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Mail, Palette, LayoutGrid, BookOpen, Lightbulb, MessageSquare } from '@/components/icons';

const adminCards = [
  { path: '/admin/announcements', label: 'Announcements', icon: Megaphone, description: 'Manage in-app announcements' },
  { path: '/admin/comms', label: 'Comms & templates', icon: Mail, description: 'Email and communication templates' },
  { path: '/admin/branding', label: 'Branding', icon: Palette, description: 'Logo and brand colors' },
  { path: '/admin/icons', label: 'Icons', icon: LayoutGrid, description: 'Upload and assign slot icons' },
  { path: '/admin/help-content', label: 'Help content', icon: BookOpen, description: 'Help center articles' },
  { path: '/admin/feature-requests', label: 'Feature requests', icon: Lightbulb, description: 'View and manage feature requests' },
  { path: '/admin/feedback', label: 'Feedback', icon: MessageSquare, description: 'User feedback' },
];

export default function AdminOverview() {
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">Manage app content, branding, and communications.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminCards.map(({ path, label, icon: Icon, description }) => (
            <Link key={path} to={path}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
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

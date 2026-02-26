import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification settings</h1>
        <p className="text-muted-foreground">Manage how and when you receive notifications.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Configure email and in-app notification preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Notification options can be added here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

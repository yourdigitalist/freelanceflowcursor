import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, Globe, FileText, CreditCard } from 'lucide-react';
import UserSettings from './settings/UserSettings';
import BusinessSettings from './settings/BusinessSettings';
import LocaleSettings from './settings/LocaleSettings';
import InvoiceSettings from './settings/InvoiceSettings';
import SubscriptionSettings from './settings/SubscriptionSettings';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('user');

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="user" className="data-[state=active]:bg-card gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="data-[state=active]:bg-card gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="locale" className="data-[state=active]:bg-card gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Locale</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-card gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-card gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Plan</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="mt-6">
            <UserSettings />
          </TabsContent>

          <TabsContent value="business" className="mt-6">
            <BusinessSettings />
          </TabsContent>

          <TabsContent value="locale" className="mt-6">
            <LocaleSettings />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <InvoiceSettings />
          </TabsContent>

          <TabsContent value="subscription" className="mt-6">
            <SubscriptionSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
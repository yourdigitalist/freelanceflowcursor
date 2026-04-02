import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import TimeTracking from "./pages/TimeTracking";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import SettingsLayout from "./pages/SettingsLayout";
import AdminLayout from "./pages/AdminLayout";
import UserSettings from "./pages/settings/UserSettings";
import BusinessSettings from "./pages/settings/BusinessSettings";
import LocaleSettings from "./pages/settings/LocaleSettings";
import InvoiceSettings from "./pages/settings/InvoiceSettings";
import SubscriptionSettings from "./pages/settings/SubscriptionSettings";
import StorageSettings from "./pages/settings/StorageSettings";
import NotificationSettings from "./pages/settings/NotificationSettings";
import HelpContentSettings from "./pages/settings/HelpContentSettings";
import FeatureRequestSettings from "./pages/settings/FeatureRequestSettings";
import FeedbackSettings from "./pages/settings/FeedbackSettings";
import BrandingSettings from "./pages/settings/BrandingSettings";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminIcons from "./pages/admin/AdminIcons";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminComms from "./pages/admin/AdminComms";
import LandingContentSettings from "./pages/admin/LandingContentSettings";
import SystemCheck from "./pages/admin/SystemCheck";
import Notifications from "./pages/Notifications";
import SearchResults from "./pages/SearchResults";
import Help from "./pages/Help";
import Notes from "./pages/Notes";
import ReviewRequests from "./pages/ReviewRequests";
import ReviewRequestDetail from "./pages/ReviewRequestDetail";
import ClientReview from "./pages/ClientReview";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import LpTest from "./pages/LpTest";
import { BrandingApply } from "@/components/BrandingApply";
import { TimerProvider } from "@/contexts/TimerContext";
import { IconSlotProvider } from "@/contexts/IconSlotContext";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setOnboardingCompleted(data?.onboarding_completed ?? false);
      setCheckingOnboarding(false);
    };
    
    if (user) {
      checkOnboarding();
    } else {
      setCheckingOnboarding(false);
    }
  }, [user]);

  if (loading || checkingOnboarding) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  
  if (onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setOnboardingCompleted(data?.onboarding_completed ?? false);
      setCheckingOnboarding(false);
    };
    
    if (user) {
      checkOnboarding();
    } else {
      setCheckingOnboarding(false);
    }
  }, [user]);

  if (loading || checkingOnboarding) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) return <Navigate to="/auth?confirm=email" replace />;
  
  if (onboardingCompleted === true) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LpTest />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/lptest" element={<LpTest />} />
      <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/list" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/active" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
      <Route path="/time" element={<Navigate to="/time/timer" replace />} />
      <Route path="/time/timer" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
      <Route path="/time/logs" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><ReviewRequests /></ProtectedRoute>} />
      <Route path="/reviews/:id" element={<ProtectedRoute><ReviewRequestDetail /></ProtectedRoute>} />
      <Route path="/review/:token" element={<ClientReview />} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverview />} />
        <Route path="system-check" element={<SystemCheck />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="comms" element={<AdminComms />} />
        <Route path="branding" element={<BrandingSettings />} />
        <Route path="icons" element={<AdminIcons />} />
        <Route path="help-content" element={<HelpContentSettings />} />
        <Route path="feature-requests" element={<FeatureRequestSettings />} />
        <Route path="feedback" element={<FeedbackSettings />} />
        <Route path="landing-content" element={<LandingContentSettings />} />
      </Route>
      <Route path="/settings" element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<UserSettings />} />
        <Route path="business" element={<BusinessSettings />} />
        <Route path="invoices" element={<InvoiceSettings />} />
        <Route path="locale" element={<LocaleSettings />} />
        <Route path="notifications" element={<NotificationSettings />} />
        <Route path="subscription" element={<SubscriptionSettings />} />
        <Route path="storage" element={<StorageSettings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrandingApply />
          <IconSlotProvider>
            <TimerProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </TimerProvider>
          </IconSlotProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

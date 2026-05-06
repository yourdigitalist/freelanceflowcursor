// @ts-nocheck
// Daily notification engine for due-soon / overdue events.
// - Projects/tasks: in-app only
// - Invoices/reviews: in-app + optional email (per user preference)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

type ChannelPref = { inApp?: boolean; email?: boolean };
type NotificationPreferences = {
  projects?: { dueSoon?: ChannelPref; overdue?: ChannelPref; daysBefore?: number };
  tasks?: { dueSoon?: ChannelPref; overdue?: ChannelPref; daysBefore?: number };
  invoices?: { dueSoon?: ChannelPref; overdue?: ChannelPref; sent?: ChannelPref; paid?: ChannelPref; daysBefore?: number };
  reviews?: { comment?: ChannelPref; status?: ChannelPref; dueSoon?: ChannelPref; overdue?: ChannelPref; daysBefore?: number };
  contracts?: { dueSoon?: ChannelPref; overdue?: ChannelPref; daysBefore?: number };
};

const DEFAULT_DAYS = 7;
function boolOrDefault(v: boolean | undefined, d = true): boolean {
  return v === undefined ? d : !!v;
}
function getDaysBefore(prefValue: number | undefined): number {
  return typeof prefValue === "number" && prefValue >= 0 && prefValue <= 30 ? prefValue : DEFAULT_DAYS;
}
function prefsWithDefaults(p: NotificationPreferences | null | undefined): NotificationPreferences {
  const x = p || {};
  return {
    projects: {
      dueSoon: { inApp: boolOrDefault(x.projects?.dueSoon?.inApp, true), email: false },
      overdue: { inApp: boolOrDefault(x.projects?.overdue?.inApp, true), email: false },
      daysBefore: getDaysBefore(x.projects?.daysBefore),
    },
    tasks: {
      dueSoon: { inApp: boolOrDefault(x.tasks?.dueSoon?.inApp, true), email: false },
      overdue: { inApp: boolOrDefault(x.tasks?.overdue?.inApp, true), email: false },
      daysBefore: getDaysBefore(x.tasks?.daysBefore),
    },
    invoices: {
      dueSoon: { inApp: boolOrDefault(x.invoices?.dueSoon?.inApp, true), email: boolOrDefault(x.invoices?.dueSoon?.email, true) },
      overdue: { inApp: boolOrDefault(x.invoices?.overdue?.inApp, true), email: boolOrDefault(x.invoices?.overdue?.email, true) },
      sent: { inApp: boolOrDefault(x.invoices?.sent?.inApp, true), email: boolOrDefault(x.invoices?.sent?.email, true) },
      paid: { inApp: boolOrDefault(x.invoices?.paid?.inApp, true), email: boolOrDefault(x.invoices?.paid?.email, true) },
      daysBefore: getDaysBefore(x.invoices?.daysBefore),
    },
    reviews: {
      comment: { inApp: boolOrDefault(x.reviews?.comment?.inApp, true), email: boolOrDefault(x.reviews?.comment?.email, true) },
      status: { inApp: boolOrDefault(x.reviews?.status?.inApp, true), email: boolOrDefault(x.reviews?.status?.email, true) },
      dueSoon: { inApp: boolOrDefault(x.reviews?.dueSoon?.inApp, true), email: boolOrDefault(x.reviews?.dueSoon?.email, true) },
      overdue: { inApp: boolOrDefault(x.reviews?.overdue?.inApp, true), email: boolOrDefault(x.reviews?.overdue?.email, true) },
      daysBefore: getDaysBefore(x.reviews?.daysBefore),
    },
    contracts: {
      dueSoon: { inApp: boolOrDefault(x.contracts?.dueSoon?.inApp, true), email: boolOrDefault(x.contracts?.dueSoon?.email, true) },
      overdue: { inApp: boolOrDefault(x.contracts?.overdue?.inApp, true), email: boolOrDefault(x.contracts?.overdue?.email, true) },
      daysBefore: getDaysBefore(x.contracts?.daysBefore ?? 3),
    },
  };
}

function dateYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const cronKey = Deno.env.get("NOTIFICATIONS_CRON_KEY");
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  if (!(cronKey && token === cronKey)) {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await userClient.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayYmd = dateYmd(today);

  const [{ data: profiles }, { data: projects }, { data: tasks }, { data: invoices }, { data: reviews }, { data: contracts }] = await Promise.all([
    supabase.from("profiles").select("user_id, email, full_name, notification_preferences"),
    supabase.from("projects").select("id, user_id, name, due_date, status").not("due_date", "is", null),
    supabase.from("tasks").select("id, user_id, title, due_date, status").not("due_date", "is", null),
    supabase.from("invoices").select("id, user_id, invoice_number, due_date, status").not("due_date", "is", null),
    supabase.from("review_requests").select("id, user_id, title, due_date, status").not("due_date", "is", null),
    supabase.from("contracts").select("id, user_id, identifier, timeline_days, sent_at, created_at, status, reminder_near_end").eq("reminder_near_end", true),
  ]);

  const notifications: Array<{ user_id: string; type: string; title: string; body: string | null; link: string | null; event_key: string }> = [];
  const emailQueue: Array<{ to: string; subject: string; text: string }> = [];

  for (const p of profiles || []) {
    const userId = p.user_id as string;
    const userEmail = ((p.email as string | null) || "").trim();
    const userName = ((p.full_name as string | null) || "there").trim() || "there";
    const prefs = prefsWithDefaults((p.notification_preferences as NotificationPreferences | null) || null);

    const pDays = getDaysBefore(prefs.projects?.daysBefore);
    const tDays = getDaysBefore(prefs.tasks?.daysBefore);
    const iDays = getDaysBefore(prefs.invoices?.daysBefore);
    const rDays = getDaysBefore(prefs.reviews?.daysBefore);
    const cDays = getDaysBefore(prefs.contracts?.daysBefore);

    const projectDueSoon = dateYmd(addDays(today, pDays));
    const taskDueSoon = dateYmd(addDays(today, tDays));
    const invoiceDueSoon = dateYmd(addDays(today, iDays));
    const reviewDueSoon = dateYmd(addDays(today, rDays));
    const contractDueSoon = dateYmd(addDays(today, cDays));

    for (const row of (projects || []).filter((x: any) => x.user_id === userId)) {
      const status = String(row.status || "");
      if (["completed", "cancelled"].includes(status)) continue;
      const due = String(row.due_date);
      if (due === projectDueSoon && prefs.projects?.dueSoon?.inApp) {
        notifications.push({
          user_id: userId,
          type: "project",
          title: "Project due soon",
          body: `${row.name || "Project"} is due in ${pDays} day${pDays === 1 ? "" : "s"}.`,
          link: "/projects",
          event_key: `project_dueSoon:${row.id}:${todayYmd}`,
        });
      }
      if (due < todayYmd && prefs.projects?.overdue?.inApp) {
        notifications.push({
          user_id: userId,
          type: "project",
          title: "Project overdue",
          body: `${row.name || "Project"} is overdue.`,
          link: "/projects",
          event_key: `project_overdue:${row.id}:${todayYmd}`,
        });
      }
    }

    for (const row of (tasks || []).filter((x: any) => x.user_id === userId)) {
      const status = String(row.status || "");
      if (status === "done") continue;
      const due = String(row.due_date);
      if (due === taskDueSoon && prefs.tasks?.dueSoon?.inApp) {
        notifications.push({
          user_id: userId,
          type: "task",
          title: "Task due soon",
          body: `${row.title || "Task"} is due in ${tDays} day${tDays === 1 ? "" : "s"}.`,
          link: "/projects",
          event_key: `task_dueSoon:${row.id}:${todayYmd}`,
        });
      }
      if (due < todayYmd && prefs.tasks?.overdue?.inApp) {
        notifications.push({
          user_id: userId,
          type: "task",
          title: "Task overdue",
          body: `${row.title || "Task"} is overdue.`,
          link: "/projects",
          event_key: `task_overdue:${row.id}:${todayYmd}`,
        });
      }
    }

    for (const row of (invoices || []).filter((x: any) => x.user_id === userId)) {
      const status = String(row.status || "");
      if (!["sent", "overdue"].includes(status)) continue;
      const due = String(row.due_date);
      const invoiceLabel = row.invoice_number ? `Invoice ${row.invoice_number}` : "Invoice";
      if (due === invoiceDueSoon) {
        if (prefs.invoices?.dueSoon?.inApp) {
          notifications.push({
            user_id: userId,
            type: "invoice",
            title: "Invoice due soon",
            body: `${invoiceLabel} is due in ${iDays} day${iDays === 1 ? "" : "s"}.`,
            link: "/invoices",
            event_key: `invoice_dueSoon:${row.id}:${todayYmd}`,
          });
        }
        if (prefs.invoices?.dueSoon?.email && userEmail) {
          emailQueue.push({
            to: userEmail,
            subject: "Invoice due soon",
            text: `Hi ${userName},\n\n${invoiceLabel} is due in ${iDays} day${iDays === 1 ? "" : "s"}.\n\nOpen invoices: ${(Deno.env.get("APP_BASE_URL") || "").replace(/\/$/, "")}/invoices`,
          });
        }
      }
      if (due < todayYmd) {
        if (prefs.invoices?.overdue?.inApp) {
          notifications.push({
            user_id: userId,
            type: "invoice",
            title: "Invoice overdue",
            body: `${invoiceLabel} is overdue.`,
            link: "/invoices",
            event_key: `invoice_overdue:${row.id}:${todayYmd}`,
          });
        }
        if (prefs.invoices?.overdue?.email && userEmail) {
          emailQueue.push({
            to: userEmail,
            subject: "Invoice overdue",
            text: `Hi ${userName},\n\n${invoiceLabel} is overdue.\n\nOpen invoices: ${(Deno.env.get("APP_BASE_URL") || "").replace(/\/$/, "")}/invoices`,
          });
        }
      }
    }

    for (const row of (reviews || []).filter((x: any) => x.user_id === userId)) {
      const status = String(row.status || "");
      if (!["pending", "commented"].includes(status)) continue;
      const due = String(row.due_date);
      if (due === reviewDueSoon) {
        if (prefs.reviews?.dueSoon?.inApp) {
          notifications.push({
            user_id: userId,
            type: "review",
            title: "Review request due soon",
            body: `${row.title || "Review request"} is due in ${rDays} day${rDays === 1 ? "" : "s"}.`,
            link: "/reviews",
            event_key: `review_dueSoon:${row.id}:${todayYmd}`,
          });
        }
        if (prefs.reviews?.dueSoon?.email && userEmail) {
          emailQueue.push({
            to: userEmail,
            subject: "Review request due soon",
            text: `Hi ${userName},\n\n${row.title || "Review request"} is due in ${rDays} day${rDays === 1 ? "" : "s"}.\n\nOpen approvals: ${(Deno.env.get("APP_BASE_URL") || "").replace(/\/$/, "")}/reviews`,
          });
        }
      }
      if (due < todayYmd) {
        if (prefs.reviews?.overdue?.inApp) {
          notifications.push({
            user_id: userId,
            type: "review",
            title: "Review request overdue",
            body: `${row.title || "Review request"} is overdue.`,
            link: "/reviews",
            event_key: `review_overdue:${row.id}:${todayYmd}`,
          });
        }
        if (prefs.reviews?.overdue?.email && userEmail) {
          emailQueue.push({
            to: userEmail,
            subject: "Review request overdue",
            text: `Hi ${userName},\n\n${row.title || "Review request"} is overdue.\n\nOpen approvals: ${(Deno.env.get("APP_BASE_URL") || "").replace(/\/$/, "")}/reviews`,
          });
        }
      }
    }

    for (const row of (contracts || []).filter((x: any) => x.user_id === userId)) {
      if (!row.timeline_days || !["pending_signatures", "signed"].includes(String(row.status || ""))) continue;
      const baseDate = new Date(String(row.sent_at || row.created_at || todayYmd));
      const dueDate = dateYmd(addDays(baseDate, Number(row.timeline_days || 0)));
      const contractLabel = row.identifier ? `Contract ${row.identifier}` : "Contract";
      if (dueDate === contractDueSoon) {
        if (prefs.contracts?.dueSoon?.inApp) {
          notifications.push({
            user_id: userId,
            type: "contract",
            title: "Contract due soon",
            body: `${contractLabel} is due in ${cDays} day${cDays === 1 ? "" : "s"}.`,
            link: "/contracts",
            event_key: `contract_dueSoon:${row.id}:${todayYmd}`,
          });
        }
        if (prefs.contracts?.dueSoon?.email && userEmail) {
          emailQueue.push({
            to: userEmail,
            subject: "Contract due soon",
            text: `Hi ${userName},\n\n${contractLabel} is due in ${cDays} day${cDays === 1 ? "" : "s"}.\n\nOpen contracts: ${(Deno.env.get("APP_BASE_URL") || "").replace(/\/$/, "")}/contracts`,
          });
        }
      }
      if (dueDate < todayYmd) {
        if (prefs.contracts?.overdue?.inApp) {
          notifications.push({
            user_id: userId,
            type: "contract",
            title: "Contract overdue",
            body: `${contractLabel} is overdue.`,
            link: "/contracts",
            event_key: `contract_overdue:${row.id}:${todayYmd}`,
          });
        }
        if (prefs.contracts?.overdue?.email && userEmail) {
          emailQueue.push({
            to: userEmail,
            subject: "Contract overdue",
            text: `Hi ${userName},\n\n${contractLabel} is overdue.\n\nOpen contracts: ${(Deno.env.get("APP_BASE_URL") || "").replace(/\/$/, "")}/contracts`,
          });
        }
      }
    }
  }

  let inAppCreated = 0;
  if (notifications.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .upsert(notifications, { onConflict: "user_id,event_key", ignoreDuplicates: true });
    if (!error) inAppCreated = notifications.length;
  }

  let emailsSent = 0;
  if (Deno.env.get("RESEND_API_KEY")) {
    for (const msg of emailQueue) {
      const { error } = await resend.emails.send({
        from: `Lance <${RESEND_FROM_EMAIL}>`,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      });
      if (!error) emailsSent++;
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    notifications_built: notifications.length,
    notifications_upserted: inAppCreated,
    emails_attempted: emailQueue.length,
    emails_sent: emailsSent,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// @ts-nocheck
// Daily cron: send automatic client invoice payment reminders based on user settings.
// profiles.reminder_enabled + profiles.reminder_days_before
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getLanceSignature } from "../_shared/lance-email.ts";
import { formatLocaleDate } from "../_shared/format-locale-date.ts";
import { generateInvoicePdfBase64 } from "../_shared/invoice-pdf.ts";
import {
  escapeHtml,
  getDefaultClientFooter,
  getDefaultClientHeader,
  parseEmailCommsConfig,
  replaceTokens,
} from "../_shared/client-email-comms.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", CHF: "CHF",
  CNY: "¥", INR: "₹", BRL: "R$", MXN: "MX$", KRW: "₩", PLN: "zł", SEK: "kr",
  NOK: "kr", DKK: "kr", CZK: "Kč", HUF: "Ft", RON: "lei", RUB: "₽", TRY: "₺",
  ZAR: "R", AED: "د.إ", SAR: "﷼", ILS: "₪", THB: "฿", IDR: "Rp", MYR: "RM",
  SGD: "S$", HKD: "HK$", NZD: "NZ$", PHP: "₱", VND: "₫", EGP: "E£", NGN: "₦",
};

function getSeparators(numberFormat: string | null | undefined): { thousands: string; decimal: string } {
  const s = String(numberFormat || "1,234.56");
  if (s.length >= 3) {
    const decimalSep = s.charAt(s.length - 3);
    const beforeDecimal = s.slice(0, -3);
    const nonDigit = beforeDecimal.replace(/\d/g, "");
    const thousands = nonDigit.slice(-1) || ",";
    if (decimalSep === "," || decimalSep === ".") {
      return { thousands: thousands || ",", decimal: decimalSep };
    }
  }
  return { thousands: ",", decimal: "." };
}

function formatNumber(amount: number, numberFormat: string | null | undefined): string {
  const n = Number(amount);
  const fixed = n.toFixed(2);
  const { thousands, decimal } = getSeparators(numberFormat);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return decPart != null ? `${withThousands}${decimal}${decPart}` : withThousands;
}

function formatCurrency(
  amount: number,
  currencyCode: string | null | undefined,
  displayFormat: string | null | undefined,
  numberFormat?: string | null,
): string {
  const code = (currencyCode || "USD").toUpperCase();
  const fmt = displayFormat || "symbol";
  const numStr = formatNumber(amount, numberFormat);
  if (fmt === "code") return `${code} ${numStr}`;
  if (fmt === "name") return `${numStr} ${code}`;
  const symbol = CURRENCY_SYMBOLS[code] || code + " ";
  return symbol + numStr;
}

function dateYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return dateYmd(d);
}

const DEFAULT_REMINDER_SUBJECT = "Reminder: Invoice {{invoice_number}} Due Soon";
const DEFAULT_REMINDER_BODY =
  "Hi {{client_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for {{total}} is due on {{due_date}}.\n\nPlease find the invoice attached. Let us know if you have any questions.\n\nThank you!";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!Deno.env.get("RESEND_API_KEY")) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!RESEND_FROM_EMAIL || !RESEND_FROM_EMAIL.includes("@")) {
    return new Response(JSON.stringify({ error: "RESEND_FROM_EMAIL not set" }), {
      status: 500,
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

  // Mark sent invoices past due as overdue (keep reminder_sent as-is so status stays visible).
  await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_date", todayYmd);

  const [{ data: profiles, error: profilesError }, { data: commsDefaults }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "user_id, full_name, email, business_name, business_logo, business_email, reminder_enabled, reminder_days_before, reminder_subject_default, reminder_body_default, currency, currency_display, number_format, date_format, client_email_primary_color, client_email_header_html, client_email_footer_html",
      )
      .eq("reminder_enabled", true),
    supabase
      .from("app_comms_defaults")
      .select("reminder_subject_default, reminder_body_default")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (profilesError) {
    console.error("profiles fetch error:", profilesError);
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const globalReminderSubject = (commsDefaults?.reminder_subject_default || DEFAULT_REMINDER_SUBJECT).trim();
  const globalReminderBody = (commsDefaults?.reminder_body_default || DEFAULT_REMINDER_BODY).trim();

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const profile of profiles || []) {
    const userId = String(profile.user_id);
    const daysBefore = Math.max(1, Number(profile.reminder_days_before) || 1);
    const targetDueDate = addDays(today, daysBefore);

    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        due_date,
        total,
        status,
        clients(name, email),
        projects(name)
      `)
      .eq("user_id", userId)
      .in("status", ["sent", "overdue"])
      .eq("due_date", targetDueDate);

    if (invoicesError) {
      errors.push(`user ${userId}: ${invoicesError.message}`);
      continue;
    }

    for (const invoice of invoices || []) {
      const clientEmail = (invoice.clients?.email || "").trim();
      if (!clientEmail) {
        skipped++;
        continue;
      }

      try {
        const { pdfBase64 } = await generateInvoicePdfBase64(supabase, invoice.id);

        const rawInvoiceNumber = String(invoice.invoice_number ?? "");
        const dateFormat = profile.date_format?.trim() || "DD/MM/YYYY";
        const rawDueDate = invoice.due_date ? formatLocaleDate(String(invoice.due_date).slice(0, 10), dateFormat) : "";
        const rawTotal = formatCurrency(
          Number(invoice.total || 0),
          profile.currency,
          profile.currency_display,
          profile.number_format,
        );
        const mergeTokens = {
          client_name: String(invoice.clients?.name ?? ""),
          invoice_number: rawInvoiceNumber,
          due_date: rawDueDate,
          total: rawTotal,
          business_name: String(profile.business_name || profile.full_name || "Your Business"),
          project_name: String(invoice.projects?.name ?? ""),
        };

        const subjectTpl = (profile.reminder_subject_default || globalReminderSubject).trim();
        const bodyTpl = (profile.reminder_body_default || globalReminderBody).trim();
        const resolvedMessage = replaceTokens(bodyTpl, mergeTokens);
        const resolvedSubject = replaceTokens(subjectTpl, mergeTokens).trim();

        const fromDisplayName = (profile.business_name || profile.full_name || "Your Business").trim();
        const replyToEmail = (profile.business_email || profile.email || "").trim();
        const primaryColor = (profile.client_email_primary_color || "#9B63E9").trim();
        const footerTpl = (profile.client_email_footer_html || "").trim();
        const safeInvoiceNumber = escapeHtml(rawInvoiceNumber);
        const safeMessage = escapeHtml(resolvedMessage);

        const coreHtml = `
        <h2 style="color: ${primaryColor}; margin-top: 0;">Reminder: Invoice ${safeInvoiceNumber}</h2>
        ${safeMessage ? `<div style="color: #333; white-space: pre-wrap;">${safeMessage}</div>` : "<p style=\"color: #666;\">Please find your invoice attached.</p>"}
      `;
        const tokens = {
          business_name: escapeHtml(fromDisplayName),
          logo_url: profile.business_logo || "",
          primary_color: primaryColor,
          body_html: coreHtml,
          invoice_number: safeInvoiceNumber,
        };
        const commsConfig = parseEmailCommsConfig(profile.client_email_header_html);
        const selectedLogo = commsConfig.logoVariant === "dark"
          ? (commsConfig.logoDark || profile.business_logo || commsConfig.logoLight || "")
          : (profile.business_logo || commsConfig.logoLight || commsConfig.logoDark || "");
        const header = getDefaultClientHeader(selectedLogo, fromDisplayName, primaryColor);
        const footer = footerTpl
          ? replaceTokens(footerTpl, tokens)
          : getDefaultClientFooter(primaryColor, fromDisplayName, replyToEmail);
        const emailHtml = `${header}${coreHtml}${footer}${getLanceSignature(primaryColor)}`;

        const emailSubject = resolvedSubject || `Reminder: Invoice ${rawInvoiceNumber} from ${fromDisplayName}`;

        const emailPayload: Record<string, unknown> = {
          from: `${fromDisplayName} <${RESEND_FROM_EMAIL}>`,
          to: [clientEmail],
          subject: emailSubject,
          html: emailHtml,
          attachments: [{ filename: `${rawInvoiceNumber}.pdf`, content: pdfBase64 }],
        };
        if (replyToEmail) emailPayload.reply_to = replyToEmail;

        const { error: emailError } = await resend.emails.send(emailPayload);
        if (emailError) {
          errors.push(`invoice ${invoice.id}: ${emailError.message}`);
          continue;
        }

        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            status: "reminder_sent",
            last_reminder_sent_at: now,
            last_reminder_automatic: true,
          })
          .eq("id", invoice.id);

        if (updateError) {
          errors.push(`invoice ${invoice.id} update: ${updateError.message}`);
          continue;
        }

        sent++;
      } catch (err) {
        errors.push(`invoice ${invoice.id}: ${(err as Error).message}`);
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sent,
      skipped,
      profiles_checked: (profiles || []).length,
      errors: errors.slice(0, 20),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

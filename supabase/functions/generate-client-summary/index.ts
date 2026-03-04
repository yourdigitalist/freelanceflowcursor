// Supabase Edge Function: generate a client-ready email summary using Google Gemini (free tier).
// Set GEMINI_API_KEY in Supabase Edge Function secrets.
// Deploy: supabase functions deploy generate-client-summary
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TimeEntryInput {
  description: string | null;
  durationMinutes: number | null;
  projectName: string;
  date?: string;
}

interface ReviewRequestInput {
  title: string;
  status: string;
  sentAt: string | null;
}

interface TaskInput {
  title: string;
  status: string | null;
  projectName: string;
}

interface InvoiceInput {
  invoice_number: string;
  status: string | null;
  total: number | null;
  due_date: string | null;
}

interface OptionsInput {
  includeHours?: boolean;
  includeTracked?: boolean;
  includeApprovalsSent?: boolean;
  includePending?: boolean;
  includeApproved?: boolean;
  includeTasks?: boolean;
  includeInvoices?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Smart summaries are not configured. Add GEMINI_API_KEY to Edge Function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const authHeader = req.headers.get("authorization");
    const tokenFromBody = body?.access_token && typeof body.access_token === "string" ? body.access_token : null;
    const token = authHeader ? authHeader.replace("Bearer ", "") : tokenFromBody;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "No authorization. Please sign in again and try again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Session expired or invalid. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timeEntries: TimeEntryInput[] = Array.isArray(body?.timeEntries) ? body.timeEntries : [];
    const reviewRequests: ReviewRequestInput[] = Array.isArray(body?.reviewRequests) ? body.reviewRequests : [];
    const tasks: TaskInput[] = Array.isArray(body?.tasks) ? body.tasks : [];
    const invoices: InvoiceInput[] = Array.isArray(body?.invoices) ? body.invoices : [];
    const options: OptionsInput = body?.options ?? {};
    const periodLabel: string = body?.periodLabel ?? "this period";

    const hasWork =
      timeEntries.length > 0 ||
      reviewRequests.length > 0 ||
      tasks.length > 0 ||
      invoices.length > 0;
    if (!hasWork) {
      return new Response(
        JSON.stringify({ error: "No data in scope. Add time entries, tasks, approvals, or invoices, or adjust the toggles." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const includeHours = options.includeHours !== false;
    const includeTracked = options.includeTracked !== false;
    const includeApprovalsSent = options.includeApprovalsSent !== false;
    const includePending = options.includePending !== false;
    const includeApproved = options.includeApproved !== false;
    const includeTasks = options.includeTasks !== false;
    const includeInvoices = options.includeInvoices !== false;

    const lines: string[] = [];
    if (timeEntries.length > 0 && (includeHours || includeTracked)) {
      lines.push("Time tracked:");
      timeEntries.forEach((e) => {
        const desc = (e.description || "Work").trim();
        const hrs = e.durationMinutes != null ? ` (${Math.round(e.durationMinutes / 60 * 10) / 10}h)` : "";
        const proj = e.projectName ? ` [${e.projectName}]` : "";
        lines.push(`- ${desc}${includeHours ? hrs : ""}${proj}`);
      });
    }
    if (reviewRequests.length > 0 && (includeApprovalsSent || includePending || includeApproved)) {
      lines.push("Approvals:");
      reviewRequests.forEach((r) => {
        const sent = r.sentAt ? " (sent)" : " (not sent)";
        lines.push(`- ${r.title}: ${r.status}${sent}`);
      });
    }
    if (tasks.length > 0 && includeTasks) {
      lines.push("Tasks (with status):");
      tasks.forEach((t) => {
        const proj = t.projectName ? ` [${t.projectName}]` : "";
        lines.push(`- ${t.title}: ${t.status || "—"}${proj}`);
      });
    }
    if (invoices.length > 0 && includeInvoices) {
      lines.push("Outstanding invoices:");
      invoices.forEach((i) => {
        const total = i.total != null ? ` Total: ${i.total}` : "";
        const due = i.due_date ? ` Due: ${i.due_date}` : "";
        lines.push(`- ${i.invoice_number}: ${i.status || "—"}${total}${due}`);
      });
    }

    function buildTemplateSummary(): string {
      const parts: string[] = [];
      parts.push(`Here's a quick update for ${periodLabel}.`);
      if (timeEntries.length > 0 && (includeHours || includeTracked)) {
        const totalMins = timeEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
        const hrs = (totalMins / 60).toFixed(1);
        parts.push(`We logged ${hrs} hours of work: ${timeEntries.map((e) => (e.description || "Work").trim()).join("; ")}.`);
      }
      if (tasks.length > 0 && includeTasks) {
        const byStatus = tasks.reduce((acc, t) => {
          const s = t.status || "—";
          if (!acc[s]) acc[s] = [];
          acc[s].push(t.title);
          return acc;
        }, {} as Record<string, string[]>);
        const taskLines = Object.entries(byStatus).map(([status, titles]) => `${status}: ${titles.join(", ")}`);
        parts.push(`Tasks: ${taskLines.join(". ")}.`);
      }
      if (reviewRequests.length > 0 && (includeApprovalsSent || includePending || includeApproved)) {
        parts.push(`Approvals: ${reviewRequests.map((r) => `${r.title} (${r.status})`).join("; ")}.`);
      }
      if (invoices.length > 0 && includeInvoices) {
        parts.push(`Outstanding invoices: ${invoices.map((i) => `#${i.invoice_number} (${i.status || "—"})`).join(", ")}.`);
      }
      parts.push("Let me know if you have any questions.");
      return parts.join(" ");
    }

    const prompt = `Write a short, professional email summary for the client about what was done ${periodLabel}. Mention: work completed, task statuses, any approvals, and outstanding invoices if relevant. Use 3-5 clear sentences. Tone: friendly and concise. Do not use bullet points in your reply.

Data:
${lines.join("\n")}

Output only the email body text, nothing else.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.3,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText);
      const isQuotaOrRateLimit = geminiRes.status === 429 || (errText && (errText.includes("quota") || errText.includes("rate")));
      if (isQuotaOrRateLimit || geminiRes.status >= 500) {
        const templateSummary = buildTemplateSummary();
        return new Response(JSON.stringify({ summary: templateSummary }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let userMessage = "Failed to generate summary. Please try again.";
      try {
        const errJson = JSON.parse(errText);
        const detail = errJson?.error?.message || errJson?.message || errJson?.error;
        if (detail && typeof detail === "string") {
          if (detail.includes("API key") || detail.includes("invalid") || geminiRes.status === 403) {
            userMessage = "Gemini API key is invalid or missing. Check GEMINI_API_KEY in Edge Function secrets.";
          } else {
            userMessage = detail.slice(0, 200);
          }
        }
      } catch {
        // use default userMessage
      }
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await geminiRes.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    const summary = part?.text?.trim() || buildTemplateSummary();

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-client-summary error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

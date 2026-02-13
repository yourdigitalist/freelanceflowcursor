// @ts-nocheck
// Supabase Edge Function (Deno). Deploy with: supabase functions deploy send-invoice
// PDF generation uses CustomJS (e.customjs.io). Set CUSTOMJS_ENDPOINT_URL and CUSTOMJS_API_KEY
// in Supabase Edge Function secrets. Paste the HTML template and JS function from the
// customjs-html-template.html and customjs-function.js files in this folder into your CustomJS dashboard.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HTML escape function to prevent XSS in emails
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface InvoiceItem {
  description: string;
  line_description?: string | null;
  line_date?: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
}

// Currency symbols for PDF (user's locale settings)
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
  numberFormat?: string | null
): string {
  const code = (currencyCode || "USD").toUpperCase();
  const fmt = displayFormat || "symbol";
  const numStr = formatNumber(amount, numberFormat);
  if (fmt === "code") return `${code} ${numStr}`;
  if (fmt === "name") return `${numStr} ${code}`;
  const symbol = CURRENCY_SYMBOLS[code] || code + " ";
  return symbol + numStr;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_EMAILS = 50; // 50 emails per user per hour

async function checkRateLimit(supabase: any, key: string, maxRequests: number): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
  
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, count")
    .eq("key", key)
    .gte("window_start", windowStart)
    .single();

  if (existing) {
    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    await supabase
      .from("rate_limits")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);
    return { allowed: true, remaining: maxRequests - existing.count - 1 };
  } else {
    await supabase
      .from("rate_limits")
      .insert({ key, count: 1, window_start: windowStart });
    return { allowed: true, remaining: maxRequests - 1 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Rate limiting check
    const rateLimitKey = `send-invoice:${user.id}`;
    const { allowed, remaining } = await checkRateLimit(supabase, rateLimitKey, RATE_LIMIT_MAX_EMAILS);
    
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600",
            "X-RateLimit-Remaining": "0"
          } 
        }
      );
    }

    const body = await req.json();
    const { invoiceId, recipientEmail, senderName, senderEmail, message, subject: customSubject, cc, receipt, downloadOnly } = body;

    if (!invoiceId) {
      throw new Error("Missing required field: invoiceId");
    }
    if (!downloadOnly && !recipientEmail) {
      throw new Error("Missing required field: recipientEmail");
    }

    console.log(`Fetching invoice ${invoiceId} for user ${user.id}`);

    // Fetch user profile with business details, logo, currency, number_format, bank, and invoice display options
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, tax_id, invoice_footer, invoice_notes_default, currency, currency_display, number_format, invoice_show_quantity, invoice_show_rate, invoice_show_line_description, invoice_show_line_date, bank_name, bank_account_number, bank_routing_number, payment_instructions")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.warn("Profile fetch warning:", profileError);
    }

    // Fetch invoice with full client info
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        clients(name, email, phone, company, tax_id, address, street, street2, city, state, postal_code, country)
      `)
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      throw new Error("Invoice not found");
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at");

    if (itemsError) {
      console.error("Items fetch error:", itemsError);
      throw new Error("Failed to fetch invoice items");
    }

    console.log(`Generating PDF for invoice ${invoice.invoice_number}`);

    const currencySymbol = (() => {
      const code = (profile?.currency || "USD").toUpperCase();
      const fmt = profile?.currency_display || "symbol";
      if (fmt === "code") return code + " ";
      return CURRENCY_SYMBOLS[code] || code + " ";
    })();

    const client = invoice?.clients;
    const senderAddress1 = [profile?.business_street, profile?.business_street2].filter(Boolean).join(", ") || "";
    const senderAddress2 = [profile?.business_city, profile?.business_state, profile?.business_postal_code].filter(Boolean).join(", ") || (profile?.business_country || "");
    const receiverAddress1 = [client?.street, client?.street2].filter(Boolean).join(", ") || "";
    const receiverAddress2 = [client?.city, client?.state, client?.postal_code].filter(Boolean).join(", ") || (client?.country || "");

    const customJsPayload = {
      invoiceNumber: invoice.invoice_number,
      createdDate: invoice.issue_date ? String(invoice.issue_date).slice(0, 10) : "",
      dueDate: invoice.due_date ? String(invoice.due_date).slice(0, 10) : "",
      clientName: client?.name || "",
      clientAddress1: receiverAddress1,
      clientAddress2: receiverAddress2.trim() || (client?.company || ""),
      clientTax: client?.tax_id || "",
      sender: {
        name: profile?.business_name || senderName || profile?.full_name || "Your Business",
        address1: senderAddress1,
        address2: [senderAddress2, profile?.business_country].filter(Boolean).join(", ").trim(),
      },
      receiver: {
        name: client?.name || "",
        address1: receiverAddress1,
        address2: receiverAddress2.trim() || (client?.company || ""),
        tax: client?.tax_id || "",
      },
      companyLogo: profile?.business_logo && typeof profile.business_logo === "string" ? profile.business_logo : "",
      items: (items || []).map((item) => ({
        description: [item.description, item.line_description].filter(Boolean).join(" – ") || "Item",
        price: Number(item.amount),
      })),
      currency: currencySymbol,
      taxRate: Number(invoice.tax_rate) || 0,
      footerText: (invoice.invoice_footer || profile?.invoice_footer || "").trim(),
    };

    const customJsUrl = Deno.env.get("CUSTOMJS_ENDPOINT_URL");
    const customJsKey = Deno.env.get("CUSTOMJS_API_KEY");
    if (!customJsUrl || !customJsKey) {
      throw new Error("PDF generation unavailable: set CUSTOMJS_ENDPOINT_URL and CUSTOMJS_API_KEY in Supabase Edge Function secrets.");
    }

    let pdfBase64: string;
    const res = await fetch(customJsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": customJsKey },
      body: JSON.stringify(customJsPayload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PDF generation failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    if (typeof data === "string") {
      pdfBase64 = data;
    } else {
      pdfBase64 = data.pdf ?? data.pdfBase64 ?? data.data ?? data.content ?? "";
    }
    if (!pdfBase64) {
      throw new Error("PDF generation failed: no PDF data in response.");
    }

    if (downloadOnly) {
      return new Response(
        JSON.stringify({ pdfBase64 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending email to ${recipientEmail}`);

    // Send email with PDF attachment - all user inputs are escaped to prevent XSS
    const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
    const safeMessage = escapeHtml(message);
    const safeSenderName = escapeHtml(senderName);
    const safeTotalFormatted = escapeHtml(currencyFmt(Number(invoice.total || 0)));
    
    const isReceipt = receipt === true;
    const emailHtml = isReceipt
      ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Receipt – Invoice ${safeInvoiceNumber}</h2>
        ${safeMessage ? `<p style="color: #333; white-space: pre-wrap;">${safeMessage}</p>` : ""}
        <p style="color: #666;">This invoice has been paid. Balance due: <strong>$0</strong>.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Thank you for your business.</p>
      </div>
    `
      : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9B63E9;">Invoice ${safeInvoiceNumber}</h2>
        ${safeMessage ? `<p style="color: #333; white-space: pre-wrap;">${safeMessage}</p>` : ""}
        <p style="color: #666;">
          Please find attached your invoice for <strong>${safeTotalFormatted}</strong>.
        </p>
        ${invoice.due_date ? `<p style="color: #666;">Payment is due by <strong>${new Date(invoice.due_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>.</p>` : ""}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          This invoice was sent via Flowdesk${safeSenderName ? ` by ${safeSenderName}` : ""}.
        </p>
      </div>
    `;

    const emailSubject = customSubject && String(customSubject).trim()
      ? customSubject
      : isReceipt
        ? `Receipt for Invoice ${invoice.invoice_number} – Paid`
        : `Invoice ${invoice.invoice_number} - ${currencyFmt(Number(invoice.total || 0))}`;

    const emailPayload: any = {
      from: senderEmail ? `${senderName || "Invoice"} <onboarding@resend.dev>` : "Invoice <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        { filename: `${invoice.invoice_number}.pdf`, content: pdfBase64 },
      ],
    };
    const ccList = Array.isArray(cc) ? cc.filter((e: string) => e && String(e).trim()) : [];
    if (ccList.length > 0) emailPayload.cc = ccList;

    const { data: emailData, error: emailError } = await resend.emails.send(emailPayload);

    if (emailError) {
      console.error("Email send error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("Email sent successfully:", emailData);

    if (!isReceipt) {
      await supabase
        .from("invoices")
        .update({ status: "sent" })
        .eq("id", invoiceId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailData?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invoice function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

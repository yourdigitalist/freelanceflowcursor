import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

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
  quantity: number;
  unit_price: number;
  amount: number;
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

    const { invoiceId, recipientEmail, senderName, senderEmail, message } = await req.json();

    if (!invoiceId || !recipientEmail) {
      throw new Error("Missing required fields: invoiceId and recipientEmail");
    }

    console.log(`Fetching invoice ${invoiceId} for user ${user.id}`);

    // Fetch user profile with business details and default content
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, tax_id, invoice_footer, invoice_notes_default")
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

    // Use business details from profile (structured address or fallback)
    const businessName = profile?.business_name || senderName || profile?.full_name || "Your Business";
    const businessEmail = profile?.business_email || senderEmail || profile?.email || "";
    const businessPhone = profile?.business_phone || "";
    const businessAddressParts = [
      profile?.business_street,
      profile?.business_street2,
      profile?.business_city,
      [profile?.business_state, profile?.business_postal_code].filter(Boolean).join(" "),
      profile?.business_country,
    ].filter(Boolean);
    const businessAddress = businessAddressParts.length > 0 ? businessAddressParts.join(", ") : (profile?.business_address || "");
    const taxId = profile?.tax_id || "";

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(155, 99, 233); // Primary purple color
    doc.text("INVOICE", 20, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(invoice.invoice_number, 20, 40);

    // From/To sections
    let yPos = 60;
    
    // From (Business)
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("FROM", 20, yPos);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    yPos += 7;
    doc.text(businessName, 20, yPos);
    if (businessEmail) {
      yPos += 5;
      doc.text(businessEmail, 20, yPos);
    }
    if (businessPhone) {
      yPos += 5;
      doc.text(businessPhone, 20, yPos);
    }
    if (businessAddress) {
      yPos += 5;
      const addressLines = doc.splitTextToSize(businessAddress, 80);
      doc.text(addressLines, 20, yPos);
      yPos += (addressLines.length - 1) * 4;
    }
    if (taxId) {
      yPos += 5;
      doc.setFontSize(9);
      doc.text(`Tax ID: ${taxId}`, 20, yPos);
    }

    // To (Client) - full details
    yPos = 60;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("BILL TO", 120, yPos);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    yPos += 7;
    const client = invoice.clients;
    if (client?.name) doc.text(client.name, 120, yPos);
    yPos += 5;
    if (client?.company) doc.text(client.company, 120, yPos);
    yPos += 5;
    if (client?.email) doc.text(client.email, 120, yPos);
    yPos += 5;
    if (client?.phone) doc.text(client.phone, 120, yPos);
    const clientAddressParts = [
      client?.street,
      client?.street2,
      client?.city,
      [client?.state, client?.postal_code].filter(Boolean).join(" "),
      client?.country,
    ].filter(Boolean);
    const clientAddress = clientAddressParts.length > 0 ? clientAddressParts.join(", ") : (client?.address || "");
    if (clientAddress) {
      yPos += 5;
      const clientAddrLines = doc.splitTextToSize(clientAddress, 75);
      doc.text(clientAddrLines, 120, yPos);
      yPos += (clientAddrLines.length - 1) * 4;
    }
    if (client?.tax_id) {
      yPos += 5;
      doc.setFontSize(9);
      doc.text(`Tax ID: ${client.tax_id}`, 120, yPos);
    }

    // Dates
    yPos = 100;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const issueDate = new Date(invoice.issue_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    doc.text(`Issue Date: ${issueDate}`, 20, yPos);
    
    if (invoice.due_date) {
      const dueDate = new Date(invoice.due_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      doc.text(`Due Date: ${dueDate}`, 120, yPos);
    }

    // Items table header
    yPos = 120;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Description", 25, yPos);
    doc.text("Qty", 110, yPos);
    doc.text("Price", 130, yPos);
    doc.text("Amount", 160, yPos);

    // Items
    yPos += 15;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    
    const invoiceItems: InvoiceItem[] = items || [];
    for (const item of invoiceItems) {
      // Wrap long descriptions
      const descLines = doc.splitTextToSize(item.description, 80);
      doc.text(descLines, 25, yPos);
      doc.text(String(item.quantity), 110, yPos);
      doc.text(`$${Number(item.unit_price).toFixed(2)}`, 130, yPos);
      doc.text(`$${Number(item.amount).toFixed(2)}`, 160, yPos);
      yPos += descLines.length * 5 + 5;
    }

    // Totals
    yPos += 10;
    doc.setDrawColor(220, 220, 220);
    doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Subtotal:", 130, yPos);
    doc.setTextColor(50, 50, 50);
    doc.text(`$${Number(invoice.subtotal || 0).toFixed(2)}`, 160, yPos);

    if (invoice.tax_rate > 0) {
      yPos += 8;
      doc.setTextColor(100, 100, 100);
      doc.text(`Tax (${invoice.tax_rate}%):`, 130, yPos);
      doc.setTextColor(50, 50, 50);
      doc.text(`$${Number(invoice.tax_amount || 0).toFixed(2)}`, 160, yPos);
    }

    yPos += 12;
    doc.setFontSize(12);
    doc.setTextColor(155, 99, 233);
    doc.text("Total:", 130, yPos);
    doc.text(`$${Number(invoice.total || 0).toFixed(2)}`, 160, yPos);

    // Notes (invoice-level or default from profile)
    const notesText = invoice.notes?.trim() || profile?.invoice_notes_default?.trim() || "";
    if (notesText) {
      yPos += 25;
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Notes:", 20, yPos);
      yPos += 7;
      doc.setTextColor(80, 80, 80);
      const noteLines = doc.splitTextToSize(notesText, pageWidth - 40);
      doc.text(noteLines, 20, yPos);
      yPos += noteLines.length * 5;
    }

    // Footer (per-invoice override or profile default)
    const footerText = invoice.invoice_footer?.trim() || profile?.invoice_footer?.trim() || "";
    if (footerText) {
      yPos += 15;
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      const footerLines = doc.splitTextToSize(footerText, pageWidth - 40);
      doc.text(footerLines, 20, yPos);
    }

    // Get PDF as base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    console.log(`Sending email to ${recipientEmail}`);

    // Send email with PDF attachment - all user inputs are escaped to prevent XSS
    const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
    const safeMessage = escapeHtml(message);
    const safeSenderName = escapeHtml(senderName);
    const safeTotal = Number(invoice.total || 0).toFixed(2);
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9B63E9;">Invoice ${safeInvoiceNumber}</h2>
        ${safeMessage ? `<p style="color: #333; white-space: pre-wrap;">${safeMessage}</p>` : ""}
        <p style="color: #666;">
          Please find attached your invoice for <strong>$${safeTotal}</strong>.
        </p>
        ${invoice.due_date ? `<p style="color: #666;">Payment is due by <strong>${new Date(invoice.due_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>.</p>` : ""}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">
          This invoice was sent via Flowdesk${safeSenderName ? ` by ${safeSenderName}` : ""}.
        </p>
      </div>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: senderEmail ? `${senderName || "Invoice"} <onboarding@resend.dev>` : "Invoice <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Invoice ${invoice.invoice_number} - $${Number(invoice.total || 0).toFixed(2)}`,
      html: emailHtml,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("Email sent successfully:", emailData);

    // Update invoice status to sent
    await supabase
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoiceId);

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

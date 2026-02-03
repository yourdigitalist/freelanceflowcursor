// @ts-nocheck
// Supabase Edge Function (Deno). Deploy with: supabase functions deploy send-invoice
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
  line_description?: string | null;
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

function formatCurrency(
  amount: number,
  currencyCode: string | null | undefined,
  displayFormat: string | null | undefined
): string {
  const code = (currencyCode || "USD").toUpperCase();
  const format = displayFormat || "symbol";
  const num = Number(amount).toFixed(2);
  if (format === "code") return `${code} ${num}`;
  if (format === "name") return `${num} ${code}`;
  const symbol = CURRENCY_SYMBOLS[code] || code + " ";
  return symbol + num;
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

    const { invoiceId, recipientEmail, senderName, senderEmail, message, subject: customSubject } = await req.json();

    if (!invoiceId || !recipientEmail) {
      throw new Error("Missing required fields: invoiceId and recipientEmail");
    }

    console.log(`Fetching invoice ${invoiceId} for user ${user.id}`);

    // Fetch user profile with business details, logo, currency, bank, and invoice display options
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, tax_id, invoice_footer, invoice_notes_default, currency, currency_display, invoice_show_quantity, invoice_show_rate, invoice_show_line_description, bank_name, bank_account_number, bank_routing_number, payment_instructions")
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

    const currencyFmt = (amount: number) =>
      formatCurrency(amount, profile?.currency, profile?.currency_display);

    // Generate PDF
    const doc = new jsPDF();
    function checkPageBreak(docRef: any, yPos: number, neededSpace: number, marginVal: number): number {
      const ph = docRef.internal.pageSize.getHeight();
      if (yPos + neededSpace > ph - 30) {
        docRef.addPage();
        return marginVal + 10;
      }
      return yPos;
    }
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const spacing = {
      lineHeight: 5.5,
      sectionGap: 12,
      paragraphGap: 6,
      tableRowPadding: 2,
      beforeFooter: 16,
    };
    const { lineHeight, sectionGap, paragraphGap, tableRowPadding, beforeFooter } = spacing;
    const showQty = profile?.invoice_show_quantity !== false;
    const showRate = profile?.invoice_show_rate !== false;
    const showLineDescription = profile?.invoice_show_line_description === true;

    const billToX = 105;
    const logoW = 40;
    const logoH = 14;
    const logoX = pageWidth - margin - logoW;
    let logoDrawn = false;
    if (profile?.business_logo) {
      const logoUrl = profile.business_logo;
      console.log("[send-invoice] Logo URL:", logoUrl ? "present" : "missing");
      try {
        const imgRes = await fetch(logoUrl, { redirect: "follow" });
        console.log("[send-invoice] Logo fetch status:", imgRes.status, imgRes.ok);
        if (imgRes.ok) {
          const arrBuf = await imgRes.arrayBuffer();
          const bytes = new Uint8Array(arrBuf);
          let base64 = "";
          for (let i = 0; i < bytes.length; i += 1024) {
            const chunk = bytes.subarray(i, Math.min(i + 1024, bytes.length));
            base64 += String.fromCharCode.apply(null, Array.from(chunk));
          }
          base64 = btoa(base64);
          const mime = imgRes.headers.get("content-type") || "image/png";
          const format = mime.includes("png") ? "PNG" : "JPEG";
          const dataUrl = `data:${mime};base64,${base64}`;
          doc.addImage(dataUrl, format, logoX, 12, logoW, logoH);
          logoDrawn = true;
          console.log("[send-invoice] Logo drawn from fetch");
        }
      } catch (e) {
        console.log("[send-invoice] Logo fetch error:", e instanceof Error ? e.message : String(e));
      }
      if (!logoDrawn && logoUrl.includes("storage/v1/object/public/business-logos/")) {
        const pathMatch = logoUrl.match(/business-logos\/(.+)$/);
        const path = pathMatch ? pathMatch[1].split("?")[0] : null;
        if (path) {
          const { data: blob, error: dlErr } = await supabase.storage.from("business-logos").download(path);
          console.log("[send-invoice] Logo storage fallback:", dlErr ? dlErr.message : "ok");
          if (!dlErr && blob) {
            const arrBuf = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrBuf);
            let base64 = "";
            for (let i = 0; i < bytes.length; i += 1024) {
              const chunk = bytes.subarray(i, Math.min(i + 1024, bytes.length));
              base64 += String.fromCharCode.apply(null, Array.from(chunk));
            }
            base64 = btoa(base64);
            const mime = blob.type || "image/png";
            const format = mime.includes("png") ? "PNG" : "JPEG";
            doc.addImage(`data:${mime};base64,${base64}`, format, logoX, 12, logoW, logoH);
            logoDrawn = true;
            console.log("[send-invoice] Logo drawn from storage");
          }
        }
      }
      if (!logoDrawn) console.log("[send-invoice] Logo skipped (unable to load)");
    }

    // Header: INVOICE title, number, dates, status (right side) — fixed at top
    let rightY = 14;
    doc.setFontSize(22);
    doc.setTextColor(155, 99, 233);
    doc.text("INVOICE", pageWidth - margin, rightY, { align: "right" });
    rightY += 6;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(invoice.invoice_number, pageWidth - margin, rightY, { align: "right" });
    rightY += 5;
    const issueDateStr = new Date(invoice.issue_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    doc.setFontSize(9);
    doc.text(`Issue Date: ${issueDateStr}`, pageWidth - margin, rightY, { align: "right" });
    rightY += 5;
    const dueDateStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : null;
    if (dueDateStr) {
      doc.text(`Due Date: ${dueDateStr}`, pageWidth - margin, rightY, { align: "right" });
      rightY += 6;
    } else rightY += 4;
    doc.setFillColor(245, 158, 11);
    try {
      if (typeof doc.roundedRect === "function") doc.roundedRect(pageWidth - margin - 26, rightY - 3.5, 26, 7, 1.5, 1.5, "F");
      else doc.rect(pageWidth - margin - 26, rightY - 3.5, 26, 7, "F");
    } catch (_) {
      doc.rect(pageWidth - margin - 26, rightY - 3.5, 26, 7, "F");
    }
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Sent", pageWidth - margin - 13, rightY + 1, { align: "center" });

    // FROM and BILL TO side-by-side at Y=44; single yPos = max of both section ends
    const startY = 44;
    let fromY = startY;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("FROM", margin, fromY);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    fromY += lineHeight + 2;
    doc.text(businessName, margin, fromY);
    fromY += lineHeight;
    if (businessEmail) {
      doc.text(businessEmail, margin, fromY);
      fromY += lineHeight;
    }
    if (businessPhone) {
      doc.text(businessPhone, margin, fromY);
      fromY += lineHeight;
    }
    if (businessAddress) {
      const addressLines = doc.splitTextToSize(businessAddress, 78);
      doc.text(addressLines, margin, fromY);
      fromY += addressLines.length * lineHeight;
    }
    if (taxId) {
      fromY += paragraphGap;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Tax ID: ${taxId}`, margin, fromY);
      doc.setTextColor(50, 50, 50);
      fromY += lineHeight;
    }

    let billToY = startY;
    const client = invoice.clients;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("BILL TO", billToX, billToY);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    billToY += lineHeight + 2;
    if (client?.name) {
      doc.text(client.name, billToX, billToY);
      billToY += lineHeight;
    }
    if (client?.company) {
      doc.text(client.company, billToX, billToY);
      billToY += lineHeight;
    }
    if (client?.email) {
      doc.text(client.email, billToX, billToY);
      billToY += lineHeight;
    }
    if (client?.phone) {
      doc.text(client.phone, billToX, billToY);
      billToY += lineHeight;
    }
    const clientAddressParts = [client?.street, client?.street2, client?.city, [client?.state, client?.postal_code].filter(Boolean).join(" "), client?.country].filter(Boolean);
    const clientAddress = clientAddressParts.length > 0 ? clientAddressParts.join(", ") : (client?.address || "");
    if (clientAddress) {
      const clientAddrLines = doc.splitTextToSize(clientAddress, 72);
      doc.text(clientAddrLines, billToX, billToY);
      billToY += clientAddrLines.length * lineHeight;
    }
    if (client?.tax_id) {
      billToY += paragraphGap;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Tax ID: ${client.tax_id}`, billToX, billToY);
      doc.setTextColor(50, 50, 50);
      billToY += lineHeight;
    }

    let yPos = Math.max(fromY, billToY) + sectionGap;
    console.log("[send-invoice] yPos after FROM/BILL TO:", yPos);

    // Table header
    yPos += 10;
    const colItem = margin + 4;
    const colAmount = pageWidth - margin - 2;
    const tableRight = pageWidth - margin;
    const colQty = showLineDescription ? 112 : 102;
    const colPrice = showQty ? 128 : 118;
    const amountLabelX = colAmount - 32;

    doc.setFillColor(248, 248, 250);
    doc.rect(margin, yPos - 4, tableRight - margin, 10, "F");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Item", colItem, yPos + 2);
    if (showLineDescription) doc.text("Description", 72, yPos + 2);
    if (showQty) doc.text("Qty", colQty, yPos + 2);
    if (showRate) doc.text("Price", colPrice, yPos + 2);
    doc.text("Amount", colAmount, yPos + 2, { align: "right" });
    yPos += 10 + tableRowPadding;
    console.log("[send-invoice] yPos after table header:", yPos);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    const invoiceItems: InvoiceItem[] = items || [];
    for (const item of invoiceItems) {
      const itemW = showLineDescription ? 64 : 76;
      const itemLines = doc.splitTextToSize(item.description, itemW);
      const lineDescLines = showLineDescription && item.line_description ? doc.splitTextToSize(item.line_description, 48) : [];
      const descLines = itemLines;
      const rowH = Math.max(descLines.length * lineHeight, lineDescLines.length * lineHeight, lineHeight) + tableRowPadding;
      yPos = checkPageBreak(doc, yPos, rowH + 4, margin);
      doc.text(itemLines, colItem, yPos);
      if (showLineDescription && item.line_description) doc.text(lineDescLines, 72, yPos);
      if (showQty) doc.text(String(item.quantity), colQty, yPos);
      if (showRate) doc.text(currencyFmt(Number(item.unit_price)), colPrice, yPos);
      doc.text(currencyFmt(Number(item.amount)), colAmount, yPos, { align: "right" });
      yPos += rowH;
    }
    console.log("[send-invoice] yPos after items (" + invoiceItems.length + " items):", yPos);

    // Totals
    yPos += sectionGap;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, yPos - 3, tableRight, yPos - 3);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Subtotal:", amountLabelX, yPos);
    doc.setTextColor(50, 50, 50);
    doc.text(currencyFmt(Number(invoice.subtotal || 0)), colAmount, yPos, { align: "right" });
    yPos += lineHeight + 2;
    if (Number(invoice.tax_rate) > 0) {
      doc.setTextColor(100, 100, 100);
      doc.text(`Tax (${invoice.tax_rate}%):`, amountLabelX, yPos);
      doc.setTextColor(50, 50, 50);
      doc.text(currencyFmt(Number(invoice.tax_amount || 0)), colAmount, yPos, { align: "right" });
      yPos += lineHeight + 2;
    }
    doc.setFontSize(11);
    doc.setTextColor(155, 99, 233);
    doc.text("Total:", amountLabelX, yPos);
    doc.text(currencyFmt(Number(invoice.total || 0)), colAmount, yPos, { align: "right" });
    yPos += lineHeight + 4;

    // Notes — sequential at yPos, then advance by actual height
    const notesText = invoice.notes?.trim() || profile?.invoice_notes_default?.trim() || "";
    yPos += beforeFooter;
    if (notesText) {
      yPos = checkPageBreak(doc, yPos, lineHeight * 4, margin);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Notes:", margin, yPos);
      yPos += lineHeight;
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      const noteLines = doc.splitTextToSize(notesText, pageWidth - 2 * margin);
      doc.text(noteLines, margin, yPos);
      yPos += noteLines.length * lineHeight + paragraphGap;
    }

    // Bank details — sequential at yPos
    const bankText = (invoice.bank_details && invoice.bank_details.trim()) || [profile?.bank_name, profile?.bank_account_number && `Account: ${profile.bank_account_number}`, profile?.bank_routing_number && `Routing: ${profile.bank_routing_number}`, profile?.payment_instructions].filter(Boolean).join("\n");
    if (bankText.trim()) {
      yPos += 8;
      yPos = checkPageBreak(doc, yPos, lineHeight * 4, margin);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Bank details:", margin, yPos);
      yPos += lineHeight;
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      const bankLines = doc.splitTextToSize(bankText.trim(), pageWidth - 2 * margin);
      doc.text(bankLines, margin, yPos);
      yPos += bankLines.length * lineHeight + 8;
    }

    // Footer — sequential at yPos (no fixed bottom position)
    const footerText = invoice.invoice_footer?.trim() || profile?.invoice_footer?.trim() || "";
    console.log("[send-invoice] yPos before footer:", yPos);
    if (footerText) {
      yPos += 8;
      const footerLines = doc.splitTextToSize(footerText, pageWidth - 2 * margin);
      yPos = checkPageBreak(doc, yPos, footerLines.length * lineHeight + 4, margin);
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(footerLines, margin, yPos);
      yPos += footerLines.length * lineHeight;
    }

    const totalPages = doc.getNumberOfPages();
    if (totalPages > 1) {
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      }
    }

    // Get PDF as base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    console.log(`Sending email to ${recipientEmail}`);

    // Send email with PDF attachment - all user inputs are escaped to prevent XSS
    const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
    const safeMessage = escapeHtml(message);
    const safeSenderName = escapeHtml(senderName);
    const safeTotalFormatted = escapeHtml(currencyFmt(Number(invoice.total || 0)));
    
    const emailHtml = `
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
      : `Invoice ${invoice.invoice_number} - ${currencyFmt(Number(invoice.total || 0))}`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: senderEmail ? `${senderName || "Invoice"} <onboarding@resend.dev>` : "Invoice <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: emailSubject,
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

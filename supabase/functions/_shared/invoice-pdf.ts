// @ts-nocheck
/** Generate invoice PDF via CustomJS (shared by send-invoice and view-invoice-pdf). */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { formatLocaleDate } from "./format-locale-date.ts";
import { formatInvoicePaymentMethod } from "./format-invoice-payment.ts";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", CHF: "CHF",
  CNY: "¥", INR: "₹", BRL: "R$", MXN: "MX$", KRW: "₩", PLN: "zł", SEK: "kr",
  NOK: "kr", DKK: "kr", CZK: "Kč", HUF: "Ft", RON: "lei", RUB: "₽", TRY: "₺",
  ZAR: "R", AED: "د.إ", SAR: "﷼", ILS: "₪", THB: "฿", IDR: "Rp", MYR: "RM",
  SGD: "S$", HKD: "HK$", NZD: "NZ$", PHP: "₱", VND: "₫", EGP: "E£", NGN: "₦",
};

export async function generateInvoicePdfBase64(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<{ pdfBase64: string; invoiceNumber: string }> {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(`
      *,
      clients(name, email, phone, company, tax_id, address, street, street2, city, state, postal_code, country),
      projects(name)
    `)
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw new Error("Invoice not found");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, email, business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, tax_id, invoice_footer, invoice_notes_default, currency, currency_display, number_format, date_format, invoice_show_quantity, invoice_show_rate, invoice_show_line_description, invoice_show_line_date, bank_name, bank_account_number, bank_routing_number, payment_instructions",
    )
    .eq("user_id", invoice.user_id)
    .maybeSingle();

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at");

  if (itemsError) {
    throw new Error("Failed to fetch invoice items");
  }

  const currencySymbol = (() => {
    const code = (profile?.currency || "USD").toUpperCase();
    const fmt = profile?.currency_display || "symbol";
    if (fmt === "code") return code + " ";
    return CURRENCY_SYMBOLS[code] || code + " ";
  })();

  const client = invoice?.clients;
  const senderAddress1 = [profile?.business_street, profile?.business_street2].filter(Boolean).join(", ") || "";
  const senderAddress2 =
    [profile?.business_city, profile?.business_state, profile?.business_postal_code].filter(Boolean).join(", ") ||
    (profile?.business_country || "");
  const receiverAddress1 = [client?.street, client?.street2].filter(Boolean).join(", ") || "";
  const receiverAddress2 =
    [client?.city, client?.state, client?.postal_code].filter(Boolean).join(", ") || (client?.country || "");

  const notesText = (invoice.notes ?? profile?.invoice_notes_default ?? "").trim();
  const bankDetailsText =
    (invoice.bank_details && String(invoice.bank_details).trim()) ||
    [profile?.bank_name, profile?.bank_account_number != null && `Account: ${profile.bank_account_number}`, profile?.bank_routing_number != null && `Routing: ${profile.bank_routing_number}`, profile?.payment_instructions]
      .filter(Boolean)
      .join("\n")
      .trim() ||
    "";

  const dateFormat = profile?.date_format?.trim() || "DD/MM/YYYY";
  const isPaidReceipt = invoice.status === "paid";
  const paidDateRaw = invoice.paid_date ?? (isPaidReceipt ? invoice.updated_at : null);
  const paidDateFormatted = paidDateRaw
    ? formatLocaleDate(String(paidDateRaw).slice(0, 10), dateFormat)
    : "";

  const customJsPayload = {
    invoiceNumber: invoice.invoice_number,
    createdDate: formatLocaleDate(invoice.issue_date, dateFormat),
    dueDate: formatLocaleDate(invoice.due_date, dateFormat),
    clientName: client?.name || "",
    clientAddress1: receiverAddress1,
    clientAddress2: receiverAddress2.trim() || (client?.company || ""),
    clientTax: client?.tax_id || "",
    sender: {
      name: profile?.business_name || profile?.full_name || "Your Business",
      address1: senderAddress1,
      address2: [senderAddress2, profile?.business_country].filter(Boolean).join(", ").trim(),
      email: profile?.business_email || "",
      phone: profile?.business_phone || "",
      tax: profile?.tax_id || "",
    },
    receiver: {
      name: client?.name || "",
      address1: receiverAddress1,
      address2: receiverAddress2.trim() || (client?.company || ""),
      tax: client?.tax_id || "",
      email: client?.email || "",
      phone: client?.phone || "",
      company: client?.company || "",
    },
    companyLogo: profile?.business_logo && typeof profile.business_logo === "string" ? profile.business_logo : "",
    items: (items || []).map((item: Record<string, unknown>) => ({
      description: item.description || "Item",
      price: Number(item.amount),
      line_date: item.line_date ? formatLocaleDate(item.line_date, dateFormat) : "",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) ?? Number(item.amount),
      line_description: item.line_description != null ? String(item.line_description) : "",
    })),
    currency: currencySymbol,
    taxRate: Number(invoice.tax_rate) || 0,
    footerText: (invoice.invoice_footer ?? profile?.invoice_footer ?? "").trim(),
    notes: notesText,
    bankDetails: bankDetailsText,
    showLineDate: profile?.invoice_show_line_date === true,
    showQuantity: profile?.invoice_show_quantity !== false,
    showRate: profile?.invoice_show_rate !== false,
    showLineDescription: profile?.invoice_show_line_description === true,
    isPaidReceipt,
    balanceDue: isPaidReceipt ? 0 : Number(invoice.total) || 0,
    paidDate: paidDateFormatted,
    paidMethod: isPaidReceipt ? formatInvoicePaymentMethod(invoice.payment_method) : "",
  };

  const customJsUrl = Deno.env.get("CUSTOMJS_ENDPOINT_URL");
  const customJsKey = Deno.env.get("CUSTOMJS_API_KEY");
  if (!customJsUrl || !customJsKey) {
    throw new Error("PDF generation unavailable.");
  }

  const res = await fetch(customJsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": customJsKey },
    body: JSON.stringify(customJsPayload),
  });
  const responseBytes = new Uint8Array(await res.arrayBuffer());
  if (!res.ok) {
    const errText = new TextDecoder().decode(responseBytes);
    throw new Error(`PDF service returned ${res.status}. ${errText.slice(0, 200)}`);
  }

  const pdfMagic = [0x25, 0x50, 0x44, 0x46];
  const isRawPdf =
    responseBytes.length >= 4 &&
    responseBytes[0] === pdfMagic[0] &&
    responseBytes[1] === pdfMagic[1] &&
    responseBytes[2] === pdfMagic[2] &&
    responseBytes[3] === pdfMagic[3];

  let pdfBase64: string;
  if (isRawPdf) {
    let binary = "";
    for (let i = 0; i < responseBytes.length; i += 8192) {
      binary += String.fromCharCode.apply(null, responseBytes.subarray(i, i + 8192) as unknown as number[]);
    }
    pdfBase64 = btoa(binary);
  } else {
    const responseText = new TextDecoder().decode(responseBytes);
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      let raw = responseText.replace(/\s/g, "").replace(/^\uFEFF/, "");
      const dataUrlMatch = /^data:application\/(?:pdf|octet-stream);base64,(.+)$/i.exec(raw);
      if (dataUrlMatch) raw = dataUrlMatch[1];
      if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length > 100) {
        pdfBase64 = raw;
      } else if (raw.startsWith("JVBERi0x") && raw.length > 100) {
        pdfBase64 = raw.replace(/[^A-Za-z0-9+/=]/g, "");
      } else {
        throw new Error("PDF service returned invalid response.");
      }
    }
    if (data !== undefined) {
      if (typeof data === "string") {
        pdfBase64 = data;
      } else if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        pdfBase64 = (obj.pdf ?? obj.pdfBase64 ?? obj.data ?? obj.content ?? "") as string;
      } else {
        pdfBase64 = "";
      }
    }
  }

  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    throw new Error("PDF service did not return a PDF.");
  }

  return { pdfBase64, invoiceNumber: String(invoice.invoice_number ?? "invoice") };
}

/** Decode base64 PDF to Uint8Array for binary HTTP responses. */
export function pdfBase64ToBytes(pdfBase64: string): Uint8Array {
  const binary = atob(pdfBase64.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Paste this entire file into the CustomJS dashboard "Custom JS Function" editor.
// Expects HTML Template variable named "HTML Template". Uses flat input fields (see CUSTOMJS-README.md).
const { HTML2PDF } = require("./utils");
const nunjucks = require("nunjucks");

// Items: parse JSON string if needed, or use array, or fallback to descriptions/prices
let items = [];
if (typeof input.items === "string" && input.items.trim()) {
  try {
    items = JSON.parse(input.items);
  } catch (e) {
    items = generateInvoiceItems(input.prices, input.descriptions);
  }
} else if (Array.isArray(input.items) && input.items.length > 0) {
  items = input.items;
} else {
  items = generateInvoiceItems(input.prices, input.descriptions);
}
items = items.map((it) => ({
  description: it.description || "",
  price: Number(it.price ?? it.amount ?? 0),
  line_date: it.line_date != null ? String(it.line_date).slice(0, 10) : "",
  quantity: Number(it.quantity ?? 1),
  unit_price: Number(it.unit_price ?? it.price ?? it.amount ?? 0),
  line_description: it.line_description != null ? String(it.line_description) : "",
}));

const subtotal = items.reduce((sum, item) => sum + Number(item.price), 0);
const taxRate = Number(input.taxRate) || 0;
const taxAmount = (subtotal * taxRate) / 100;
const total = subtotal + taxAmount;

// Sender: from flat fields or input.sender object
const sender = input.sender && typeof input.sender === "object"
  ? input.sender
  : {
      name: input.senderName || "",
      address1: input.senderAddress1 || "",
      address2: input.senderAddress2 || "",
      email: input.senderEmail || "",
      phone: input.senderPhone || "",
      tax: input.senderTax || "",
    };

// Receiver: from flat fields or input.receiver object
const receiver = input.receiver && typeof input.receiver === "object"
  ? input.receiver
  : {
      name: input.clientName || input.receiverName || "",
      address1: input.clientAddress1 || input.receiverAddress1 || "",
      address2: input.clientAddress2 || input.receiverAddress2 || "",
      tax: input.clientTax || input.receiverTax || "",
      email: input.receiverEmail || "",
      phone: input.receiverPhone || "",
      company: input.receiverCompany || "",
    };

const content = nunjucks.renderString(variables["HTML Template"], {
  invoiceNumber: input.invoiceNumber || "",
  createdDate: input.createdDate || "",
  dueDate: input.dueDate || "",
  companyLogo: input.companyLogo || "",
  sender,
  receiver,
  items,
  subtotal,
  taxAmount,
  total,
  taxRate,
  currency: input.currency || "USD",
  footerText: input.footerText || "",
  notes: input.notes || "",
  bankDetails: input.bankDetails || "",
  showLineDate: !!input.showLineDate,
  showQuantity: input.showQuantity !== false,
  showRate: input.showRate !== false,
  showLineDescription: !!input.showLineDescription,
});

return await HTML2PDF(content);

function generateInvoiceItems(prices, descriptions) {
  if (!prices || !descriptions) return [];
  const descs = (descriptions || "").split(",").map((d) => d.trim());
  return (prices || "").split(",").map((p, i) => ({
    price: Number(p) || 0,
    description: descs[i] || "",
    line_date: "",
    quantity: 1,
    unit_price: Number(p) || 0,
    line_description: "",
  }));
}

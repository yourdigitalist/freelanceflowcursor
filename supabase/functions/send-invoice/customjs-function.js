// Paste this entire file into the CustomJS dashboard "Custom JS Function" editor.
// Expects HTML Template variable named "HTML Template". Uses flat input fields (see CUSTOMJS-README.md).
const { HTML2PDF } = require("./utils");
const nunjucks = require("nunjucks");

function generateInvoiceItems(prices, descriptions) {
  if (!prices || !descriptions) {
    return [];
  }
  const descs = descriptions.split(",").map(function(d) {
    return d.trim();
  });
  return prices.split(",").map(function(p, i) {
    return {
      price: Number(p) || 0,
      description: descs[i] || "",
      line_date: "",
      quantity: 1,
      unit_price: Number(p) || 0,
      line_description: ""
    };
  });
}

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

items = items.map(function(it) {
  return {
    description: it.description || "",
    price: Number(it.price != null ? it.price : (it.amount != null ? it.amount : 0)),
    line_date: it.line_date != null ? String(it.line_date).slice(0, 10) : "",
    quantity: Number(it.quantity != null ? it.quantity : 1),
    unit_price: Number(it.unit_price != null ? it.unit_price : (it.price != null ? it.price : (it.amount != null ? it.amount : 0))),
    line_description: it.line_description != null ? String(it.line_description) : ""
  };
});

const subtotal = items.reduce(function(sum, item) {
  return sum + Number(item.price);
}, 0);

const taxRate = Number(input.taxRate) || 0;
const taxAmount = (subtotal * taxRate) / 100;
const total = subtotal + taxAmount;

const sender = (input.sender && typeof input.sender === "object") ? input.sender : {
  name: input.senderName || "",
  address1: input.senderAddress1 || "",
  address2: input.senderAddress2 || "",
  email: input.senderEmail || "",
  phone: input.senderPhone || "",
  tax: input.senderTax || ""
};

const receiver = (input.receiver && typeof input.receiver === "object") ? input.receiver : {
  name: input.clientName || input.receiverName || "",
  address1: input.clientAddress1 || input.receiverAddress1 || "",
  address2: input.clientAddress2 || input.receiverAddress2 || "",
  tax: input.clientTax || input.receiverTax || "",
  email: input.receiverEmail || "",
  phone: input.receiverPhone || "",
  company: input.receiverCompany || ""
};

const content = nunjucks.renderString(variables["HTML Template"], {
  invoiceNumber: input.invoiceNumber || "",
  createdDate: input.createdDate || "",
  dueDate: input.dueDate || "",
  companyLogo: input.companyLogo || "",
  sender: sender,
  receiver: receiver,
  items: items,
  subtotal: subtotal,
  taxAmount: taxAmount,
  total: total,
  taxRate: taxRate,
  currency: input.currency || "USD",
  footerText: input.footerText || "",
  notes: input.notes || "",
  bankDetails: input.bankDetails || "",
  showLineDate: input.showLineDate === "true" || input.showLineDate === true,
  showQuantity: input.showQuantity !== "false" && input.showQuantity !== false,
  showRate: input.showRate === "true" || input.showRate === true,
  showLineDescription: input.showLineDescription === "true" || input.showLineDescription === true
});

return await HTML2PDF(content);

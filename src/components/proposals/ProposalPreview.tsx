import { Building2, CreditCard, Upload, Wallet } from "@/components/icons";

type PreviewItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  line_total: number;
};

type Props = {
  proposal: {
    identifier: string;
    presentation: string | null;
    objective: string | null;
    subtotal: number;
    discount_type: string;
    discount_value: number;
    total: number;
    timeline_days: number | null;
    payment_structure: string | null;
    payment_methods: string[];
    conditions_notes: string | null;
    discount_amount?: number;
  };
  items: PreviewItem[];
  businessName?: string | null;
  businessLogo?: string | null;
  clientName?: string | null;
  clientCompany?: string | null;
  projectName?: string | null;
  coverImageUrl?: string | null;
  ctaEmail?: string | null;
  ctaPhone?: string | null;
};

function paymentLabel(method: string) {
  return method
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PaymentMethodIcon({ method }: { method: string }) {
  if (method.includes("bank")) return <Building2 className="h-3.5 w-3.5" />;
  if (method.includes("card")) return <CreditCard className="h-3.5 w-3.5" />;
  if (method.includes("crypto")) return <Upload className="h-3.5 w-3.5" />;
  return <Wallet className="h-3.5 w-3.5" />;
}

export function ProposalPreview({
  proposal,
  items,
  businessName,
  businessLogo,
  clientName,
  clientCompany,
  projectName,
  coverImageUrl,
  ctaEmail,
  ctaPhone,
}: Props) {
  const discountAmount = proposal.discount_amount ?? (proposal.discount_type === "percent"
    ? proposal.subtotal * ((proposal.discount_value || 0) / 100)
    : proposal.discount_value);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="relative h-48 bg-gradient-to-r from-violet-600 to-purple-500 text-white">
        {coverImageUrl ? <img src={coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" /> : null}
        <div className="relative p-6">
          <p className="text-sm/none opacity-90">{businessName || "Proposal"}</p>
          <h2 className="mt-2 text-2xl font-bold">{proposal.identifier}</h2>
          {projectName ? <p className="mt-1 text-sm opacity-90">Project: {projectName}</p> : null}
        </div>
      </div>
      <div className="space-y-6 p-6">
        <section className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Client</p>
            <p className="font-medium">{clientName || "—"}</p>
            <p className="text-sm text-muted-foreground">{clientCompany || "—"}</p>
          </div>
          <div className="md:text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Prepared by</p>
            <div className="inline-flex items-center gap-2 md:ml-auto">
              {businessLogo ? <img src={businessLogo} alt={businessName || "Business logo"} className="h-8 w-auto max-w-[120px] object-contain" /> : null}
              <p className="font-medium">{businessName || "—"}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-semibold">About You</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{proposal.presentation || "—"}</p>
        </section>
        <section>
          <h3 className="font-semibold">Objective</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{proposal.objective || "—"}</p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">Services</h3>
          {items.map((i) => (
            <div key={i.id} className="flex items-start justify-between border-b pb-2">
              <div>
                <p className="font-medium">{i.name}</p>
                <p className="text-sm text-muted-foreground">{i.description || ""}</p>
              </div>
              <p className="text-sm">${i.line_total.toFixed(2)}</p>
            </div>
          ))}
          <div className="space-y-1 pt-2 text-sm">
            <p>Subtotal: ${proposal.subtotal.toFixed(2)}</p>
            <p className="text-emerald-600">
              Discount: ${discountAmount.toFixed(2)}
              {proposal.discount_type === "percent" ? ` (${proposal.discount_value}%)` : ""}
            </p>
            <p className="rounded-md bg-blue-50 px-3 py-2 font-semibold text-blue-800">Total: ${proposal.total.toFixed(2)}</p>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Project Duration</h3>
            <p className="text-sm text-muted-foreground">{proposal.timeline_days ? `${proposal.timeline_days} days` : "Not specified"}</p>
          </div>
          <div>
            <h3 className="font-semibold">Payment</h3>
            <p className="text-sm text-muted-foreground">{proposal.payment_structure ? paymentLabel(proposal.payment_structure) : "Not specified"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(proposal.payment_methods || []).map((method) => (
                <span key={method} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs text-muted-foreground">
                  <PaymentMethodIcon method={method} />
                  {paymentLabel(method)}
                </span>
              ))}
            </div>
          </div>
        </section>
        {proposal.conditions_notes ? (
          <section>
            <h3 className="font-semibold">Notes</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{proposal.conditions_notes}</p>
          </section>
        ) : null}

        <section className="rounded-xl bg-zinc-900 p-6 text-white">
          <h3 className="text-xl font-semibold">Ready to move forward?</h3>
          <p className="mt-1 text-sm text-zinc-300">It will be a pleasure to work on your project.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900">
              {ctaPhone ? "Send WhatsApp" : "Send Message"}
            </button>
            <button type="button" className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white">
              Accept Proposal
            </button>
          </div>
          {(ctaEmail || ctaPhone) ? (
            <p className="mt-4 text-xs text-zinc-300">
              {[ctaEmail, ctaPhone].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

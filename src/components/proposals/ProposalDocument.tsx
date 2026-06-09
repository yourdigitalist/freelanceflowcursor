import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/icons";
import { SlotIcon } from "@/contexts/IconSlotContext";
import { clientLogoPublicUrl } from "@/lib/clientLogo";
import { displayProposalClientCompany, displayProposalClientName } from "@/lib/proposalClientDisplay";

export type ProposalDocumentBusiness = {
  business_name?: string | null;
  business_logo?: string | null;
  business_email?: string | null;
  email?: string | null;
  notification_preferences?: { proposal_main_color?: string } | null;
};

export type ProposalDocumentProps = {
  proposal: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  business?: ProposalDocumentBusiness | null;
  coverImageUrl?: string | null;
  proposalMainColor?: string;
  showAcceptActions?: boolean;
  onAccept?: () => void;
  onSendMessage?: () => void;
  accepting?: boolean;
  acceptError?: string | null;
};

const DEFAULT_MAIN_COLOR = "#9b63e9";

const rgba = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return `rgba(155, 99, 233, ${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(Number(value || 0));

const paymentLabel = (value: string) =>
  value.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

/** Shared column layout for service rows, header, and totals */
const SERVICE_TABLE_GRID =
  "grid w-full grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_3.25rem_6.75rem] items-start gap-x-6";
const SERVICE_TABLE_ROW = SERVICE_TABLE_GRID + " px-3";

export function ProposalDocument({
  proposal,
  items,
  business,
  coverImageUrl,
  proposalMainColor: proposalMainColorProp,
  showAcceptActions = true,
  onAccept,
  onSendMessage,
  accepting = false,
  acceptError = null,
}: ProposalDocumentProps) {
  const proposalMainColor =
    proposalMainColorProp ||
    (business?.notification_preferences?.proposal_main_color as string | undefined) ||
    DEFAULT_MAIN_COLOR;
  const discountAmount = proposal.discount_type === "percent"
    ? Number(proposal.subtotal || 0) * (Number(proposal.discount_value || 0) / 100)
    : Number(proposal.discount_value || 0);
  const total = Math.max(0, Number(proposal.subtotal || 0) - discountAmount);
  const primaryCurrency = items[0]?.currency || "USD";
  const clientDisplayName = displayProposalClientName(proposal);
  const clientDisplayCompany = displayProposalClientCompany(proposal);
  const clientInitial = (clientDisplayName === "—" ? "C" : clientDisplayName).charAt(0).toUpperCase();
  const clientLogoUrl = clientLogoPublicUrl(
    (proposal as { clients?: { logo_url?: string | null } }).clients?.logo_url,
  );
  const businessInitial = (business?.business_name || "B")
    .split(" ")
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  return (
      <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-2xl border border-[#e7e0f4] bg-white">
        <div className="relative overflow-hidden px-9 pb-14 pt-10" style={{ backgroundColor: proposalMainColor }}>
          {coverImageUrl ? (
            <>
              <img
                src={coverImageUrl}
                alt="Proposal cover"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[#1a1a2e]/50" />
            </>
          ) : null}
          <div className="relative">
            <div className="mb-2 text-[17px] text-[#e7e0f4] opacity-95">{business?.business_name || "Your Business"}</div>
            {proposal?.projects?.name ? <div className="text-3xl font-medium text-white">{proposal.projects.name}</div> : null}
            <div className="mt-2 text-lg text-[#f4edff]">{proposal.identifier}</div>
          </div>
        </div>

        <div className="border-b border-[#e7e0f4] px-8 py-7">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide" style={{ color: proposalMainColor }}>Proposal Details</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2.5">
              {clientLogoUrl ? (
                <img
                  src={clientLogoUrl}
                  alt={clientDisplayName}
                  className="h-[38px] w-[38px] rounded-full object-cover border bg-white"
                />
              ) : (
                <div
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-sm font-medium"
                  style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}
                >
                  {clientInitial}
                </div>
              )}
              <div>
                <div className="mb-0.5 text-xs text-muted-foreground">Client</div>
                <div className="text-[16px] leading-relaxed font-medium text-[#1a1a2e]">{clientDisplayName}</div>
                {clientDisplayCompany ? <div className="text-[13px] text-muted-foreground">{clientDisplayCompany}</div> : null}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {business?.business_logo ? (
                <img
                  src={business.business_logo}
                  alt={business?.business_name || "Business logo"}
                  className="h-[38px] w-[38px] rounded-md object-contain p-1"
                  style={{ backgroundColor: rgba(proposalMainColor, 0.14) }}
                />
              ) : (
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-sm font-medium" style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}>
                  {businessInitial}
                </div>
              )}
              <div>
                <div className="mb-0.5 text-xs text-muted-foreground">Prepared by</div>
                <div className="text-[16px] leading-relaxed font-medium text-[#1a1a2e]">{business?.business_name || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        <section className="border-b border-[#e7e0f4] px-8 py-7">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}>
              <SlotIcon slot="proposal_about" className="h-4 w-4" />
            </div>
              <div className="text-base font-semibold text-[#1a1a2e]">About</div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#333333]">{proposal.presentation || "—"}</p>
        </section>

        <section className="border-b border-[#e7e0f4] px-8 py-7">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}>
              <SlotIcon slot="proposal_objective" className="h-4 w-4" />
            </div>
              <div className="text-base font-semibold text-[#1a1a2e]">Project Objective</div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#333333]">{proposal.objective || "—"}</p>
        </section>

        <section className="border-b border-[#e7e0f4] px-8 py-7">
            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}>
              <SlotIcon slot="proposal_services" className="h-4 w-4" />
            </div>
            <div className="text-base font-semibold text-[#1a1a2e]">Services</div>
          </div>

          <div className={SERVICE_TABLE_ROW + " border-b border-[#e7e0f4] py-2"}>
            <div className="text-xs text-muted-foreground">Service</div>
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="text-right text-xs text-muted-foreground">Qty</div>
            <div className="text-right text-xs text-muted-foreground">Value</div>
          </div>

          {items.map((item: any) => (
            <div key={item.id} className={SERVICE_TABLE_ROW + " border-b border-[#e7e0f4] py-4"}>
              <div className="text-[15px] font-medium leading-snug text-[#1a1a2e]">{item.name}</div>
              <div className="text-[13px] leading-relaxed text-muted-foreground">{item.description || "—"}</div>
              <div className="pt-0.5 text-right text-[15px] tabular-nums text-muted-foreground">{item.quantity}</div>
              <div className="pt-0.5 text-right text-[15px] font-medium tabular-nums" style={{ color: proposalMainColor }}>
                {formatCurrency(item.line_total, item.currency || primaryCurrency)}
              </div>
            </div>
          ))}

          <div className={SERVICE_TABLE_ROW + " border-b border-[#e7e0f4] py-2.5"}>
            <div className="col-span-3 text-xs text-muted-foreground">Subtotal</div>
            <div className="text-right text-xs tabular-nums text-muted-foreground">{formatCurrency(proposal.subtotal, primaryCurrency)}</div>
          </div>
          <div className={SERVICE_TABLE_ROW + " border-b border-[#e7e0f4] py-2.5"}>
            <div className="col-span-3 text-xs text-muted-foreground">Discount</div>
            <div className="text-right text-xs tabular-nums" style={{ color: proposalMainColor }}>
              {formatCurrency(discountAmount, primaryCurrency)}
              {proposal.discount_type === "percent" ? ` (${proposal.discount_value}%)` : ""}
            </div>
          </div>
          <div className="w-full rounded-lg" style={{ backgroundColor: rgba(proposalMainColor, 0.14) }}>
            <div className={SERVICE_TABLE_ROW + " py-2.5"}>
              <div className="col-span-3 text-[13px] font-medium" style={{ color: proposalMainColor }}>
                Total
              </div>
              <div className="text-right text-[13px] font-medium tabular-nums" style={{ color: proposalMainColor }}>
                {formatCurrency(total, primaryCurrency)}
              </div>
            </div>
          </div>
        </section>

        <section className="flex gap-4 border-b border-[#e7e0f4] px-8 py-7">
          <div className="flex-1">
              <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}>
                <SlotIcon slot="proposal_duration" className="h-3.5 w-3.5" />
              </div>
              <div className="text-base font-semibold text-[#1a1a2e]">Duration</div>
            </div>
            <div className="text-sm leading-relaxed text-[#333333]">
              {proposal.timeline_days ? `${proposal.timeline_days} days` : "Not specified"}
            </div>
          </div>
          <div className="w-px bg-[#e7e0f4]" />
          <div className="flex-1">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}>
                <SlotIcon slot="proposal_payment" className="h-3.5 w-3.5" />
              </div>
              <div className="text-base font-semibold text-[#1a1a2e]">Payment</div>
            </div>
            <div className="text-sm leading-relaxed text-[#333333]">{proposal.payment_structure ? paymentLabel(proposal.payment_structure) : "Not specified"}</div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              {(proposal.payment_methods || []).length
                ? (proposal.payment_methods || []).map((method: string) => paymentLabel(method)).join(", ")
                : "No methods"}
            </div>
            {proposal.payment_structure === "installments" && proposal.installment_description ? (
              <p className="mt-2 text-[13px] leading-relaxed text-[#333333]">
                {proposal.installment_description}
              </p>
            ) : null}
          </div>
        </section>

        <section className="border-b border-[#e7e0f4] px-8 py-7">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}>
              <SlotIcon slot="proposal_notes" className="h-3.5 w-3.5" />
            </div>
            <div className="text-base font-semibold text-[#1a1a2e]">Notes</div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#333333]">{proposal.conditions_notes || "—"}</p>
        </section>

        {showAcceptActions ? (
        <section className="bg-[#1a1a2e] px-8 py-12 text-center">
          {business?.business_logo ? (
            <img
              src={business.business_logo}
              alt={business?.business_name || "Business logo"}
              className="mx-auto mb-3 h-11 w-auto max-w-[120px] object-contain rounded-sm bg-[#e7e0f4] p-1"
            />
          ) : (
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium" style={{ backgroundColor: rgba(proposalMainColor, 0.14), color: proposalMainColor }}>
              {businessInitial}
            </div>
          )}
          <div className="mb-1.5 text-lg font-medium text-white">Ready to work together?</div>
          <div className="mb-5 text-xs leading-relaxed text-[#a0a0b8]">It would be a pleasure to work on your project!</div>
          {proposal?.status === "accepted" ? (
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
              <p className="font-medium leading-relaxed">Proposal Accepted</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-100/90">
                {proposal.accepted_at
                  ? `Accepted on ${new Date(proposal.accepted_at).toLocaleString()}`
                  : "Accepted"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {acceptError ? (
                <p className="text-sm text-red-300">{acceptError}</p>
              ) : null}
              <div className="flex justify-center gap-2.5">
                <Button
                  variant="outline"
                  className="border-[#a0a0b8] bg-transparent text-xs text-white hover:bg-white/10"
                  onClick={onSendMessage}
                  disabled={accepting}
                >
                  Send a message
                </Button>
                <Button
                  className="bg-[#22c55e] text-xs text-white hover:bg-[#16a34a]"
                  onClick={onAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    "Accept Proposal"
                  )}
                </Button>
              </div>
            </div>
          )}
        </section>
        ) : null}

        <section className="bg-[#faf9fe] px-8 py-6 text-center">
          <div className="text-xs font-medium text-[#1a1a2e]">
            {business?.business_name || "Your Business"}
            {business?.business_email ? ` · ${business.business_email}` : ""}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {proposal.identifier}
            {proposal.expires_at ? ` · Valid until ${new Date(proposal.expires_at).toLocaleDateString()}` : ""}
          </div>
        </section>
      </div>
  );
}

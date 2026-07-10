import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/icons";
import { useDroppable } from "@dnd-kit/core";
import {
  parseProposalLayoutDocument,
  type ProposalLayoutBlock,
  type ProposalLayoutDocument,
} from "@/lib/proposals2/layoutSchema";
import type { ProposalDocumentBusiness } from "@/components/proposals/ProposalDocument";

type ProposalRendererMode = "editor" | "client" | "pdf";

type BuilderSelection =
  | { kind: "container"; containerId: string }
  | { kind: "block"; containerId: string; blockId: string };

type ProposalRendererProps = {
  proposal: Record<string, any>;
  items: Array<Record<string, any>>;
  business?: ProposalDocumentBusiness | null;
  coverImageUrl?: string | null;
  layout: ProposalLayoutDocument;
  mode: ProposalRendererMode;
  onAccept?: () => void;
  onSendMessage?: () => void;
  accepting?: boolean;
  acceptError?: string | null;
  builderSelection?: BuilderSelection | null;
  onSelectContainer?: (containerId: string) => void;
  onSelectBlock?: (containerId: string, blockId: string) => void;
  getContainerLabel?: (containerId: string, index: number) => string;
  containerDropId?: string | null;
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(Number(value || 0));

const paymentLabel = (value: string) =>
  value.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const spacerHeightClass = {
  sm: "h-3",
  md: "h-6",
  lg: "h-10",
} as const;

const fontWeightMap = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

function ProposalBlockRenderer({
  block,
  proposal,
  items,
  business,
  mode,
  mainColor,
  onAccept,
  onSendMessage,
  accepting,
  acceptError,
}: {
  block: ProposalLayoutBlock;
  proposal: Record<string, any>;
  items: Array<Record<string, any>>;
  business?: ProposalDocumentBusiness | null;
  mode: ProposalRendererMode;
  mainColor: string;
  onAccept?: () => void;
  onSendMessage?: () => void;
  accepting?: boolean;
  acceptError?: string | null;
}) {
  const subtotal = Number(proposal.subtotal || 0);
  const discountAmount = proposal.discount_type === "percent"
    ? subtotal * (Number(proposal.discount_value || 0) / 100)
    : Number(proposal.discount_value || 0);
  const total = Math.max(0, subtotal - discountAmount);
  const primaryCurrency = items[0]?.currency || "USD";

  switch (block.type) {
    case "heading": {
      const cls = block.level === 1 ? "text-3xl" : block.level === 2 ? "text-2xl" : "text-xl";
      return (
        <h2
          className={cls}
          style={{
            fontSize: `${block.style.fontSize}px`,
            color: block.style.color,
            fontWeight: fontWeightMap[block.style.fontWeight],
            textAlign: block.style.textAlign,
            fontFamily: block.style.fontFamily,
          }}
        >
          {block.text}
        </h2>
      );
    }
    case "paragraph":
      return (
        <p
          className="whitespace-pre-wrap leading-relaxed"
          style={{
            fontSize: `${block.style.fontSize}px`,
            color: block.style.color,
            fontWeight: fontWeightMap[block.style.fontWeight],
            textAlign: block.style.textAlign,
            fontFamily: block.style.fontFamily,
          }}
        >
          {block.text}
        </p>
      );
    case "image":
      return block.src ? (
        <img
          src={block.src}
          alt={block.alt || "Proposal image"}
          className="w-full object-cover"
          style={{ borderRadius: `${block.radius}px` }}
        />
      ) : (
        <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-center text-xs text-muted-foreground">
          Image block (no source set)
        </div>
      );
    case "divider":
      return (
        <div
          className="w-full"
          style={{
            height: `${block.thickness}px`,
            backgroundColor: block.color,
          }}
        />
      );
    case "proposal-meta":
      return (
        <div className="space-y-1 rounded-lg border border-[#e7e0f4] bg-white p-4">
          {block.showProjectName && proposal?.projects?.name ? (
            <p className="text-lg font-medium text-[#1a1a2e]">{proposal.projects.name}</p>
          ) : null}
          {block.showIdentifier ? (
            <p className="text-sm text-muted-foreground">{proposal.identifier || "Draft proposal"}</p>
          ) : null}
        </div>
      );
    case "client-business":
      return (
        <div className="rounded-lg border border-[#e7e0f4] bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Parties</p>
          <p className="mt-2 text-sm text-[#333333]">Client: {proposal?.clients?.name || proposal?.client_name_snapshot || "—"}</p>
          <p className="text-sm text-[#333333]">Prepared by: {business?.business_name || "—"}</p>
        </div>
      );
    case "services-table":
      return (
        <div className="rounded-lg border border-[#e7e0f4] bg-white p-4">
          <p className="mb-3 text-base font-semibold text-[#1a1a2e]">Services</p>
          <div className={`grid gap-2 border-b border-[#e7e0f4] pb-2 text-xs text-muted-foreground ${block.showDescription ? "grid-cols-[1.4fr_1.8fr_0.8fr_1fr]" : "grid-cols-[2fr_0.8fr_1fr]"}`}>
            <p>Service</p>
            {block.showDescription ? <p>Description</p> : null}
            {block.showQuantity ? <p className="text-right">Qty</p> : null}
            <p className="text-right">Value</p>
          </div>
          <div className="space-y-2 pt-2">
            {items.map((item) => (
              <div key={item.id} className={`grid gap-2 text-sm ${block.showDescription ? "grid-cols-[1.4fr_1.8fr_0.8fr_1fr]" : "grid-cols-[2fr_0.8fr_1fr]"}`}>
                <p>{item.name}</p>
                {block.showDescription ? <p className="text-muted-foreground">{item.description || "—"}</p> : null}
                {block.showQuantity ? <p className="text-right text-muted-foreground">{item.quantity || 1}</p> : null}
                <p className="text-right font-medium">{formatCurrency(item.line_total || 0, item.currency || primaryCurrency)}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "totals":
      return (
        <div className="rounded-lg border border-[#e7e0f4] bg-white p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, primaryCurrency)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Discount</span>
            <span>
              {formatCurrency(discountAmount, primaryCurrency)}
              {proposal.discount_type === "percent" ? ` (${proposal.discount_value}%)` : ""}
            </span>
          </div>
          <div className="mt-2 flex justify-between rounded-md px-3 py-2 font-semibold" style={{ backgroundColor: `${mainColor}1f`, color: mainColor }}>
            <span>Total</span>
            <span>{formatCurrency(total, primaryCurrency)}</span>
          </div>
        </div>
      );
    case "conditions":
      return (
        <div className="rounded-lg border border-[#e7e0f4] bg-white p-4 text-sm text-[#333333]">
          <p className="mb-2 text-base font-semibold text-[#1a1a2e]">Conditions</p>
          {block.showTimeline ? <p>Duration: {proposal.timeline_days ? `${proposal.timeline_days} days` : "Not specified"}</p> : null}
          {block.showPaymentStructure ? <p>Payment structure: {proposal.payment_structure ? paymentLabel(proposal.payment_structure) : "Not specified"}</p> : null}
          {block.showPaymentMethods ? (
            <p>Payment methods: {(proposal.payment_methods || []).length ? (proposal.payment_methods || []).map((method: string) => paymentLabel(method)).join(", ") : "No methods"}</p>
          ) : null}
          {block.showInstallmentDescription && proposal.payment_structure === "installments" && proposal.installment_description ? (
            <p>Installments: {proposal.installment_description}</p>
          ) : null}
          {block.showNotes ? <p className="mt-2 whitespace-pre-wrap">Notes: {proposal.conditions_notes || "—"}</p> : null}
        </div>
      );
    case "acceptance":
      if (mode === "client") {
        return (
          <section className="rounded-lg bg-[#1a1a2e] px-6 py-8 text-center">
            <div className="mb-2 text-lg font-medium text-white">Ready to work together?</div>
            <div className="mb-4 text-xs text-[#a0a0b8]">You can accept online right away.</div>
            {proposal?.status === "accepted" ? (
              <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                Proposal Accepted
              </div>
            ) : (
              <div className="space-y-3">
                {acceptError ? <p className="text-sm text-red-300">{acceptError}</p> : null}
                <div className="flex justify-center gap-2.5">
                  <Button variant="outline" className="border-[#a0a0b8] bg-transparent text-xs text-white hover:bg-white/10" onClick={onSendMessage} disabled={accepting}>
                    Send a message
                  </Button>
                  <Button className="bg-[#22c55e] text-xs text-white hover:bg-[#16a34a]" onClick={onAccept} disabled={accepting}>
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
        );
      }
      return (
        <div className="rounded-lg border border-dashed border-[#e7e0f4] bg-white px-6 py-8 text-center">
          <p className="text-sm font-medium text-[#1a1a2e]">Acceptance block</p>
          <p className="mt-1 text-xs text-muted-foreground">Clients will see accept actions on the public proposal page.</p>
        </div>
      );
    case "spacer":
      return <div className={spacerHeightClass[block.size]} />;
    default:
      return null;
  }
}

function BuilderContainerSection({
  container,
  containerIndex,
  isBuilder,
  builderSelection,
  containerDropId,
  getContainerLabel,
  onSelectContainer,
  renderBlock,
}: {
  container: ProposalLayoutDocument["containers"][number];
  containerIndex: number;
  isBuilder: boolean;
  builderSelection: BuilderSelection | null;
  containerDropId: string | null;
  getContainerLabel?: (containerId: string, index: number) => string;
  onSelectContainer?: (containerId: string) => void;
  renderBlock: (containerId: string, block: ProposalLayoutBlock) => ReactNode;
}) {
  const droppable = useDroppable({ id: `container-drop:${container.id}`, disabled: !isBuilder });
  const leftBlocks = container.blocks.filter((item) => item.column === 0);
  const rightBlocks = container.blocks.filter((item) => item.column === 1);
  const containerSelected = builderSelection?.kind === "container" && builderSelection.containerId === container.id;
  const label = getContainerLabel?.(container.id, containerIndex) || `Section ${containerIndex + 1}`;
  const showDrop = containerDropId === container.id;

  return (
    <section
      ref={droppable.setNodeRef}
      className={`relative ${container.columns === 2 ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "space-y-4"} ${
        isBuilder ? `cursor-pointer transition-shadow ${containerSelected ? "ring-2 ring-primary ring-offset-2" : "hover:ring-1 hover:ring-primary/30"}` : ""
      }`}
      style={{
        backgroundColor: container.style.backgroundColor,
        padding: `${container.style.padding}px`,
        borderRadius: `${container.style.radius}px`,
      }}
      onClick={() => onSelectContainer?.(container.id)}
      role={isBuilder ? "button" : undefined}
      tabIndex={isBuilder ? 0 : undefined}
      onKeyDown={
        isBuilder
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectContainer?.(container.id);
              }
            }
          : undefined
      }
    >
      {isBuilder ? (
        <div className="pointer-events-none absolute -top-3 left-3 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border">
          {label}
        </div>
      ) : null}
      <div className="space-y-4">
        {leftBlocks.map(({ block }) => renderBlock(container.id, block))}
      </div>
      {container.columns === 2 ? (
        <div className="space-y-4">
          {rightBlocks.map(({ block }) => renderBlock(container.id, block))}
        </div>
      ) : null}
      {isBuilder && showDrop ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-3 rounded-md border-2 border-dashed border-primary bg-primary/10 py-3 text-center text-xs font-medium text-primary">
          Drop to add block
        </div>
      ) : null}
    </section>
  );
}

export function ProposalRenderer({
  proposal,
  items,
  business,
  coverImageUrl,
  layout,
  mode,
  onAccept,
  onSendMessage,
  accepting,
  acceptError,
  builderSelection = null,
  onSelectContainer,
  onSelectBlock,
  getContainerLabel,
  containerDropId = null,
}: ProposalRendererProps) {
  const parsedLayout = parseProposalLayoutDocument(layout);
  if (!parsedLayout) return null;
  const mainColor = parsedLayout.theme.mainColor || "#9b63e9";
  const isBuilder = mode === "editor" && Boolean(onSelectContainer || onSelectBlock);

  const renderBlock = (containerId: string, block: ProposalLayoutBlock) => {
    const content = (
      <ProposalBlockRenderer
        block={block}
        proposal={proposal}
        items={items}
        business={business}
        mode={mode}
        mainColor={mainColor}
        onAccept={onAccept}
        onSendMessage={onSendMessage}
        accepting={accepting}
        acceptError={acceptError}
      />
    );

    if (!isBuilder || !onSelectBlock) return <div key={block.id}>{content}</div>;

    const selected = builderSelection?.kind === "block" && builderSelection.blockId === block.id;
    return (
      <div
        key={block.id}
        className={`relative rounded-md transition-shadow ${selected ? "ring-2 ring-primary ring-offset-2" : "hover:ring-1 hover:ring-primary/40"}`}
        onClick={(event) => {
          event.stopPropagation();
          onSelectBlock(containerId, block.id);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectBlock(containerId, block.id);
          }
        }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-2xl border border-[#e7e0f4] bg-white">
      <div className="relative overflow-hidden px-9 pb-12 pt-10" style={{ backgroundColor: mainColor }}>
        {coverImageUrl ? (
          <>
            <img src={coverImageUrl} alt="Proposal cover" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[#1a1a2e]/45" />
          </>
        ) : null}
        <div className="relative">
          <div className="text-[17px] text-[#e7e0f4]">{business?.business_name || "Your Business"}</div>
          <div className="mt-1 text-3xl font-medium text-white">{proposal?.projects?.name || "Proposal"}</div>
        </div>
      </div>

      <div className="space-y-4 bg-[#faf9fe] p-6" data-render-mode={mode}>
        {parsedLayout.containers.map((container, containerIndex) => (
          <BuilderContainerSection
            key={container.id}
            container={container}
            containerIndex={containerIndex}
            isBuilder={isBuilder}
            builderSelection={builderSelection}
            containerDropId={containerDropId}
            getContainerLabel={getContainerLabel}
            onSelectContainer={onSelectContainer}
            renderBlock={renderBlock}
          />
        ))}
      </div>
    </div>
  );
}

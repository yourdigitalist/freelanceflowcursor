import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Trash2 } from "@/components/icons";
import type { ProposalLayoutBlock, ProposalLayoutDocument } from "@/lib/proposals2/layoutSchema";
import { blockTypeLabels } from "@/lib/proposals2/builderUtils";

export type BuilderSelection =
  | { kind: "container"; containerId: string }
  | { kind: "block"; containerId: string; blockId: string };

type ProposalBuilderInspectorProps = {
  layout: ProposalLayoutDocument;
  selection: BuilderSelection;
  onClearSelection: () => void;
  onChange: (next: ProposalLayoutDocument) => void;
  onSelectBlock: (containerId: string, blockId: string) => void;
};

const fontFamilies = [
  { value: "inherit", label: "Default" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Helvetica, sans-serif", label: "Helvetica" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
];

export function ProposalBuilderInspector({
  layout,
  selection,
  onClearSelection,
  onChange,
  onSelectBlock,
}: ProposalBuilderInspectorProps) {
  const updateDocument = (updater: (current: ProposalLayoutDocument) => ProposalLayoutDocument) =>
    onChange(updater(layout));

  const updateContainer = (
    containerId: string,
    updater: (container: ProposalLayoutDocument["containers"][number]) => ProposalLayoutDocument["containers"][number],
  ) => {
    updateDocument((current) => ({
      ...current,
      containers: current.containers.map((container) => (container.id === containerId ? updater(container) : container)),
    }));
  };

  const updateBlock = (containerId: string, blockId: string, updater: (block: ProposalLayoutBlock) => ProposalLayoutBlock) => {
    updateContainer(containerId, (container) => ({
      ...container,
      blocks: container.blocks.map((entry) =>
        entry.block.id === blockId ? { ...entry, block: updater(entry.block) } : entry,
      ),
    }));
  };

  const moveBlock = (containerId: string, blockId: string, direction: -1 | 1) => {
    updateContainer(containerId, (container) => {
      const index = container.blocks.findIndex((entry) => entry.block.id === blockId);
      if (index < 0) return container;
      const target = index + direction;
      if (target < 0 || target >= container.blocks.length) return container;
      const next = [...container.blocks];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...container, blocks: next };
    });
  };

  const removeBlock = (containerId: string, blockId: string) => {
    updateContainer(containerId, (container) => ({
      ...container,
      blocks: container.blocks.filter((entry) => entry.block.id !== blockId),
    }));
    onClearSelection();
  };

  const removeContainer = (containerId: string) => {
    updateDocument((current) => ({
      ...current,
      containers: current.containers.filter((container) => container.id !== containerId),
    }));
    onClearSelection();
  };

  if (selection.kind === "container") {
    const containerIndex = layout.containers.findIndex((entry) => entry.id === selection.containerId);
    const container = layout.containers[containerIndex];
    if (!container) return null;

    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onClearSelection}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to layout
          </Button>
          <h3 className="text-sm font-semibold">Section settings</h3>
          <p className="text-xs text-muted-foreground">Configure this section of your proposal.</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-1">
            <Label>Section name</Label>
            <Input
              value={container.title || ""}
              placeholder={`Section ${containerIndex + 1}`}
              onChange={(event) => updateContainer(container.id, (current) => ({ ...current, title: event.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Layout</Label>
            <Select
              value={String(container.columns)}
              onValueChange={(value) =>
                updateContainer(container.id, (current) => ({
                  ...current,
                  columns: value === "2" ? 2 : 1,
                  blocks: value === "1" ? current.blocks.map((item) => ({ ...item, column: 0 as const })) : current.blocks,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Single column</SelectItem>
                <SelectItem value="2">Two columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Background</Label>
              <Input
                type="color"
                value={container.style.backgroundColor}
                onChange={(event) =>
                  updateContainer(container.id, (current) => ({
                    ...current,
                    style: { ...current.style, backgroundColor: event.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Corner radius</Label>
              <Input
                type="number"
                min={0}
                max={32}
                value={container.style.radius}
                onChange={(event) =>
                  updateContainer(container.id, (current) => ({
                    ...current,
                    style: { ...current.style, radius: Number(event.target.value || 0) },
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Padding</Label>
            <Input
              type="number"
              min={0}
              max={96}
              value={container.style.padding}
              onChange={(event) =>
                updateContainer(container.id, (current) => ({
                  ...current,
                  style: { ...current.style, padding: Number(event.target.value || 0) },
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Blocks in this section</Label>
            {container.blocks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No blocks yet. Drag elements from the left panel.</p>
            ) : (
              <div className="space-y-1">
                {container.blocks.map((entry, index) => (
                  <button
                    key={entry.block.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-muted/40"
                    onClick={() => onSelectBlock(container.id, entry.block.id)}
                  >
                    <span>{blockTypeLabels[entry.block.type]}</span>
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {layout.containers.length > 1 ? (
            <Button type="button" variant="outline" className="w-full text-destructive" onClick={() => removeContainer(container.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete section
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const container = layout.containers.find((entry) => entry.id === selection.containerId);
  const blockEntry = container?.blocks.find((entry) => entry.block.id === selection.blockId);
  const block = blockEntry?.block;
  if (!container || !block || !blockEntry) return null;

  const blockIndex = container.blocks.findIndex((entry) => entry.block.id === selection.blockId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onClearSelection}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to layout
        </Button>
        <h3 className="text-sm font-semibold">{blockTypeLabels[block.type]}</h3>
        <p className="text-xs text-muted-foreground">Edit content and styling for this block.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {container.columns === 2 ? (
          <div className="space-y-1">
            <Label>Column</Label>
            <Select
              value={String(blockEntry.column)}
              onValueChange={(value) =>
                updateContainer(container.id, (current) => ({
                  ...current,
                  blocks: current.blocks.map((entry) =>
                    entry.block.id === block.id ? { ...entry, column: value === "1" ? 1 : 0 } : entry,
                  ),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Left column</SelectItem>
                <SelectItem value="1">Right column</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {(block.type === "heading" || block.type === "paragraph") && (
          <>
            {block.type === "heading" ? (
              <div className="space-y-1">
                <Label>Heading level</Label>
                <Select
                  value={String(block.level)}
                  onValueChange={(value) =>
                    updateBlock(container.id, block.id, (current) =>
                      current.type === "heading" ? { ...current, level: Number(value) as 1 | 2 | 3 } : current,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Large</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">Small</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label>Text</Label>
              <Textarea
                rows={block.type === "heading" ? 2 : 5}
                value={block.text}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "heading" || current.type === "paragraph" ? { ...current, text: event.target.value } : current,
                  )
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Font size</Label>
                <Input
                  type="number"
                  min={10}
                  max={72}
                  value={block.style.fontSize}
                  onChange={(event) =>
                    updateBlock(container.id, block.id, (current) =>
                      current.type === "heading" || current.type === "paragraph"
                        ? { ...current, style: { ...current.style, fontSize: Number(event.target.value || 16) } }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={block.style.color}
                  onChange={(event) =>
                    updateBlock(container.id, block.id, (current) =>
                      current.type === "heading" || current.type === "paragraph"
                        ? { ...current, style: { ...current.style, color: event.target.value } }
                        : current,
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Font</Label>
              <Select
                value={block.style.fontFamily}
                onValueChange={(value) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "heading" || current.type === "paragraph"
                      ? { ...current, style: { ...current.style, fontFamily: value } }
                      : current,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Weight</Label>
                <Select
                  value={block.style.fontWeight}
                  onValueChange={(value) =>
                    updateBlock(container.id, block.id, (current) =>
                      current.type === "heading" || current.type === "paragraph"
                        ? { ...current, style: { ...current.style, fontWeight: value as typeof block.style.fontWeight } }
                        : current,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="semibold">Semibold</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Align</Label>
                <Select
                  value={block.style.textAlign}
                  onValueChange={(value) =>
                    updateBlock(container.id, block.id, (current) =>
                      current.type === "heading" || current.type === "paragraph"
                        ? { ...current, style: { ...current.style, textAlign: value as typeof block.style.textAlign } }
                        : current,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {block.type === "image" && (
          <>
            <div className="space-y-1">
              <Label>Image URL</Label>
              <Input
                value={block.src}
                placeholder="https://..."
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "image" ? { ...current, src: event.target.value } : current,
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Alt text</Label>
              <Input
                value={block.alt}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "image" ? { ...current, alt: event.target.value } : current,
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Corner radius</Label>
              <Input
                type="number"
                min={0}
                max={48}
                value={block.radius}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "image" ? { ...current, radius: Number(event.target.value || 0) } : current,
                  )
                }
              />
            </div>
          </>
        )}

        {block.type === "divider" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Color</Label>
              <Input
                type="color"
                value={block.color}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "divider" ? { ...current, color: event.target.value } : current,
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Thickness</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={block.thickness}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "divider" ? { ...current, thickness: Number(event.target.value || 1) } : current,
                  )
                }
              />
            </div>
          </div>
        )}

        {block.type === "spacer" && (
          <div className="space-y-1">
            <Label>Size</Label>
            <Select
              value={block.size}
              onValueChange={(value) =>
                updateBlock(container.id, block.id, (current) =>
                  current.type === "spacer" ? { ...current, size: value as typeof block.size } : current,
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {block.type === "services-table" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={block.showDescription}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "services-table" ? { ...current, showDescription: event.target.checked } : current,
                  )
                }
              />
              Show description column
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={block.showQuantity}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "services-table" ? { ...current, showQuantity: event.target.checked } : current,
                  )
                }
              />
              Show quantity column
            </label>
          </div>
        )}

        {block.type === "proposal-meta" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={block.showIdentifier}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "proposal-meta" ? { ...current, showIdentifier: event.target.checked } : current,
                  )
                }
              />
              Show proposal ID
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={block.showProjectName}
                onChange={(event) =>
                  updateBlock(container.id, block.id, (current) =>
                    current.type === "proposal-meta" ? { ...current, showProjectName: event.target.checked } : current,
                  )
                }
              />
              Show project name
            </label>
          </div>
        )}

        {block.type === "conditions" && (
          <div className="space-y-2">
            {(
              [
                ["showTimeline", "Timeline"],
                ["showPaymentStructure", "Payment structure"],
                ["showPaymentMethods", "Payment methods"],
                ["showInstallmentDescription", "Installment details"],
                ["showNotes", "Notes"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={block[key]}
                  onChange={(event) =>
                    updateBlock(container.id, block.id, (current) =>
                      current.type === "conditions" ? { ...current, [key]: event.target.checked } : current,
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-t pt-4">
          <Button type="button" variant="outline" className="flex-1" disabled={blockIndex <= 0} onClick={() => moveBlock(container.id, block.id, -1)}>
            Move up
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={blockIndex >= container.blocks.length - 1}
            onClick={() => moveBlock(container.id, block.id, 1)}
          >
            Move down
          </Button>
        </div>

        <Button type="button" variant="outline" className="w-full text-destructive" onClick={() => removeBlock(container.id, block.id)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete block
        </Button>
      </div>
    </div>
  );
}

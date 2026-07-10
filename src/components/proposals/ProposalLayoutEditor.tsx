import { useCallback, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProposalBuilderInspector, type BuilderSelection } from "@/components/proposals/ProposalBuilderInspector";
import { ProposalRenderer } from "@/components/proposals/ProposalRenderer";
import type { ProposalLayoutDocument } from "@/lib/proposals2/layoutSchema";
import {
  createBlock,
  createContainer,
  getContainerDisplayName,
  paletteItems,
  type NewBlockType,
} from "@/lib/proposals2/builderUtils";

type ProposalLayoutEditorProps = {
  value: ProposalLayoutDocument;
  onChange: (next: ProposalLayoutDocument) => void;
  proposal: Record<string, any>;
  items: Array<Record<string, any>>;
  business?: Record<string, any> | null;
  coverImageUrl?: string | null;
};

function PaletteItem({ type, label, description }: { type: NewBlockType; label: string; description: string }) {
  const draggable = useDraggable({ id: `palette:${type}` });
  return (
    <button
      type="button"
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      className="w-full rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50 active:cursor-grabbing"
      style={{ cursor: draggable.isDragging ? "grabbing" : "grab" }}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

export function ProposalLayoutEditor({
  value,
  onChange,
  proposal,
  items,
  business,
  coverImageUrl,
}: ProposalLayoutEditorProps) {
  const [selection, setSelection] = useState<BuilderSelection | null>(null);
  const [activePaletteType, setActivePaletteType] = useState<NewBlockType | null>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const updateDocument = useCallback(
    (updater: (current: ProposalLayoutDocument) => ProposalLayoutDocument) => onChange(updater(value)),
    [onChange, value],
  );

  const addBlockToContainer = (containerId: string, type: NewBlockType) => {
    const block = createBlock(type);
    updateDocument((current) => ({
      ...current,
      containers: current.containers.map((container) =>
        container.id === containerId ? { ...container, blocks: [...container.blocks, { column: 0, block }] } : container,
      ),
    }));
    setSelection({ kind: "block", containerId, blockId: block.id });
  };

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("palette:")) {
      setActivePaletteType(id.replace("palette:", "") as NewBlockType);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (overId?.startsWith("container-drop:")) {
      setOverContainerId(overId.replace("container-drop:", ""));
      return;
    }
    setOverContainerId(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePaletteType(null);
    setOverContainerId(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId.startsWith("palette:") && overId.startsWith("container-drop:")) {
      addBlockToContainer(overId.replace("container-drop:", ""), activeId.replace("palette:", "") as NewBlockType);
    }
  };

  const onDragCancel = () => {
    setActivePaletteType(null);
    setOverContainerId(null);
  };

  const getContainerLabel = (containerId: string, index: number) => {
    const container = value.containers.find((entry) => entry.id === containerId);
    return container ? getContainerDisplayName(container, index) : `Section ${index + 1}`;
  };

  const activeDropContainerId = activePaletteType ? overContainerId : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <div className="flex min-h-[72vh] overflow-hidden rounded-xl border bg-muted/20">
        <aside className="w-[240px] shrink-0 border-r bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Elements</h2>
            <p className="text-xs text-muted-foreground">Drag into a section on the canvas.</p>
          </div>
          <div className="space-y-2 overflow-y-auto p-3">
            {paletteItems.map((item) => (
              <PaletteItem key={item.type} type={item.type} label={item.label} description={item.description} />
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-[#f4f2f8] p-6">
          <div className="mx-auto mb-4 flex max-w-[1120px] items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Brand color</Label>
                <Input
                  type="color"
                  className="h-9 w-14 p-1"
                  value={value.theme.mainColor}
                  onChange={(event) =>
                    updateDocument((current) => ({
                      ...current,
                      theme: { ...current.theme, mainColor: event.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateDocument((current) => ({
                  ...current,
                  containers: [...current.containers, createContainer(current.containers.length + 1)],
                }))
              }
            >
              Add section
            </Button>
          </div>

          <div className="mx-auto max-w-[1120px]">
            <ProposalRenderer
              proposal={proposal}
              items={items}
              business={business}
              coverImageUrl={coverImageUrl}
              layout={value}
              mode="editor"
              builderSelection={selection}
              onSelectContainer={(containerId) => setSelection({ kind: "container", containerId })}
              onSelectBlock={(containerId, blockId) => setSelection({ kind: "block", containerId, blockId })}
              getContainerLabel={getContainerLabel}
              containerDropId={activeDropContainerId}
            />
          </div>
        </main>

        {selection ? (
          <aside className="w-[300px] shrink-0 border-l bg-background">
            <ProposalBuilderInspector
              layout={value}
              selection={selection}
              onClearSelection={() => setSelection(null)}
              onChange={onChange}
              onSelectBlock={(containerId, blockId) => setSelection({ kind: "block", containerId, blockId })}
            />
          </aside>
        ) : null}
      </div>

      <DragOverlay>
        {activePaletteType ? (
          <div className="rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-lg">
            {paletteItems.find((item) => item.type === activePaletteType)?.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

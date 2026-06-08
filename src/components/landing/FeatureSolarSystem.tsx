import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CheckSquare,
  Clock,
  FileSignature,
  FileText,
  FolderKanban,
  Globe,
  Receipt,
  Users,
  X,
} from "lucide-react";

export const FEATURE_SOLAR_BG = "/landing/feature-solar-system.png?v=4";

type FeatureItem = {
  id: string;
  label: string;
  top: number;
  left: number;
  icon: LucideIcon;
  description: string;
  float: { duration: number; delay: number; distance: number };
  popoverPlacement: "top" | "bottom" | "left" | "right";
};

/** Native artwork size — pill % positions map to this box (see feature-solar-system.png). */
export const FEATURE_SOLAR_WIDTH = 1024;
export const FEATURE_SOLAR_HEIGHT = 611;

/**
 * Hand-tuned left%/top% on the 1024×611 artwork (inner / outer dashed ellipses).
 * Do not derive from orbit math — the rings are static illustration.
 */
/** Tuned inward toward visual center (50%, ~54%) of the 1024×611 artwork. */
const FEATURE_POSITIONS: Record<string, { left: number; top: number }> = {
  clients: { left: 50, top: 22.5 },
  time: { left: 73.4, top: 32.4 },
  projects: { left: 26.6, top: 32.4 },
  invoices: { left: 84.2, top: 43.2 },
  portal: { left: 15.8, top: 43.2 },
  proposals: { left: 78.8, top: 61.2 },
  tasks: { left: 21.2, top: 61.2 },
  contracts: { left: 62.6, top: 73.8 },
  approvals: { left: 37.4, top: 73.8 },
};

type FeatureDef = Omit<FeatureItem, "top" | "left">;

const FEATURE_DEFS: FeatureDef[] = [
  {
    id: "clients",
    label: "Clients",
    icon: Users,
    description:
      "Manage your full client pipeline in one place — from new lead to active project. Track contacts, set follow-ups, and log activity without digging through email threads.",
    float: { duration: 4.2, delay: 0, distance: 5 },
    popoverPlacement: "bottom",
  },
  {
    id: "time",
    label: "Time Tracking",
    icon: Clock,
    description:
      "Log billable hours with one click. Lance tracks time against projects and feeds it straight into your invoices.",
    float: { duration: 4.8, delay: 0.8, distance: 6 },
    popoverPlacement: "left",
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: Receipt,
    description:
      "Turn completed work into a polished invoice in seconds. Track payments and send reminders automatically.",
    float: { duration: 4.5, delay: 1.1, distance: 5 },
    popoverPlacement: "left",
  },
  {
    id: "proposals",
    label: "Proposals",
    icon: FileText,
    description:
      "Send professional proposals clients can review and accept online. Win work faster with less back-and-forth in email.",
    float: { duration: 4.1, delay: 1.4, distance: 6 },
    popoverPlacement: "top",
  },
  {
    id: "contracts",
    label: "Contracts",
    icon: FileSignature,
    description:
      "Create, send, and store contracts linked to clients and projects. Keep terms and signatures where the rest of your work lives.",
    float: { duration: 4.6, delay: 0.3, distance: 5 },
    popoverPlacement: "top",
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: BadgeCheck,
    description:
      "Share a link. Your client clicks, comments, and approves — no account, no app. Pin feedback directly on your files.",
    float: { duration: 3.5, delay: 0.9, distance: 3 },
    popoverPlacement: "top",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: CheckSquare,
    description:
      "A kanban board built for service teams. Priorities, due dates, and statuses — exactly what you need, nothing more.",
    float: { duration: 3.8, delay: 0.6, distance: 4 },
    popoverPlacement: "top",
  },
  {
    id: "portal",
    label: "Client Portal",
    icon: Globe,
    description:
      "Give clients a polished hub to view projects, files, and updates — without handing them your whole back office or another login to forget.",
    float: { duration: 3.4, delay: 0.2, distance: 3 },
    popoverPlacement: "right",
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    description:
      "Keep every engagement organised with clear statuses, timelines, and deliverables. Tie work to clients so nothing slips between tools.",
    float: { duration: 3.6, delay: 0.4, distance: 4 },
    popoverPlacement: "right",
  },
];

const FEATURES: FeatureItem[] = FEATURE_DEFS.map((def) => {
  const position = FEATURE_POSITIONS[def.id];
  if (!position) throw new Error(`Missing solar position for ${def.id}`);
  return { ...def, ...position };
});

const FEATURES_BY_ID = Object.fromEntries(FEATURE_DEFS.map((def) => [def.id, def])) as Record<
  string,
  FeatureDef
>;

/** Mobile grid order (2-column layout). */
const MOBILE_GRID_ORDER = [
  "clients",
  "projects",
  "time",
  "invoices",
  "proposals",
  "contracts",
  "approvals",
  "tasks",
  "portal",
] as const;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

function FeaturePill({
  feature,
  isActive,
  onActivate,
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  feature: FeatureItem;
  isActive: boolean;
  onActivate: () => void;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = feature.icon;
  const { duration, delay, distance } = feature.float;

  return (
    <motion.button
      type="button"
      className="feature-solar-pill"
      style={{
        left: `${feature.left}%`,
        top: `${feature.top}%`,
      }}
      onClick={onClick}
      onFocus={onActivate}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-expanded={isActive}
      aria-haspopup="dialog"
    >
      <motion.span
        className="feature-solar-pill-inner"
        animate={reduceMotion ? undefined : { y: [0, -distance, 0] }}
        transition={
          reduceMotion
            ? undefined
            : {
                duration,
                delay,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Icon className="feature-solar-pill-icon" strokeWidth={2.2} aria-hidden />
        <span>{feature.label}</span>
      </motion.span>
      {children}
    </motion.button>
  );
}

function FeaturePopover({
  feature,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: {
  feature: FeatureItem;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, [feature.id]);

  const offset =
    feature.popoverPlacement === "top"
      ? {
          top: "auto",
          bottom: "calc(100% + 12px)",
          left: "50%",
          transform: "translateX(-50%)",
        }
      : feature.popoverPlacement === "bottom"
        ? {
            top: "calc(100% + 12px)",
            left: "50%",
            transform: "translateX(-50%)",
          }
        : feature.popoverPlacement === "left"
          ? {
              right: "calc(100% + 12px)",
              top: "50%",
              transform: "translateY(-50%)",
            }
          : {
              left: "calc(100% + 12px)",
              top: "50%",
              transform: "translateY(-50%)",
            };

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-labelledby={`feature-popover-title-${feature.id}`}
      tabIndex={-1}
      className="feature-solar-popover"
      style={offset}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        type="button"
        className="feature-solar-popover-close"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={16} />
      </button>
      <h3 id={`feature-popover-title-${feature.id}`}>{feature.label}</h3>
      <p>{feature.description}</p>
    </motion.div>
  );
}

function MobileGridPill({
  feature,
  isActive,
  onClick,
}: {
  feature: FeatureDef;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = feature.icon;
  return (
    <button
      type="button"
      className="feature-solar-pill"
      onClick={onClick}
      aria-expanded={isActive}
      aria-haspopup="dialog"
    >
      <span className="feature-solar-pill-inner">
        <Icon className="feature-solar-pill-icon" strokeWidth={2.2} aria-hidden />
        <span>{feature.label}</span>
      </span>
    </button>
  );
}

export default function FeatureSolarSystem() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const activeFeature = FEATURES.find((f) => f.id === activeId) ?? null;

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cancelClose();
    setActiveId(null);
  }, [cancelClose]);

  const open = useCallback(
    (id: string) => {
      cancelClose();
      setActiveId(id);
    },
    [cancelClose],
  );

  const scheduleClose = useCallback(() => {
    if (isMobile) return;
    cancelClose();
    closeTimerRef.current = setTimeout(() => setActiveId(null), 140);
  }, [isMobile, cancelClose]);

  useEffect(() => {
    if (!activeId) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = containerRef.current;
      if (!root?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeId, close]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  const handlePillClick = (id: string) => {
    setActiveId((current) => (current === id ? null : id));
  };

  const mobileGridFeatures = MOBILE_GRID_ORDER.map((id) => FEATURES_BY_ID[id]);

  return (
    <div ref={containerRef}>
      <div className="feature-solar solar-desktop-only">
        <div className="feature-solar-stage">
          <img
            src={FEATURE_SOLAR_BG}
            alt=""
            className="feature-solar-bg"
            width={1024}
            height={611}
            decoding="async"
          />

          <div className="feature-solar-pills feature-solar-pills--overlay" aria-label="Lance features">
            {FEATURES.map((feature) => (
              <FeaturePill
                key={feature.id}
                feature={feature}
                isActive={activeId === feature.id}
                onActivate={() => open(feature.id)}
                onClick={() => handlePillClick(feature.id)}
                onMouseEnter={() => open(feature.id)}
                onMouseLeave={() => scheduleClose()}
              >
                <AnimatePresence>
                  {activeId === feature.id && (
                    <FeaturePopover
                      feature={feature}
                      onClose={close}
                      onPointerEnter={cancelClose}
                      onPointerLeave={scheduleClose}
                    />
                  )}
                </AnimatePresence>
              </FeaturePill>
            ))}
          </div>
        </div>
      </div>

      <div className="solar-mobile-shell">
        <div className="solar-mobile-grid" aria-label="Lance features">
          {mobileGridFeatures.map((feature) => (
            <MobileGridPill
              key={feature.id}
              feature={feature}
              isActive={activeId === feature.id}
              onClick={() => handlePillClick(feature.id)}
            />
          ))}
        </div>

        <AnimatePresence>
          {activeFeature && isMobile && (
            <motion.div
              className="feature-solar-mobile-detail"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22 }}
            >
              <button
                type="button"
                className="feature-solar-popover-close"
                onClick={close}
                aria-label="Close"
              >
                <X size={16} />
              </button>
              <h3>{activeFeature.label}</h3>
              <p>{activeFeature.description}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

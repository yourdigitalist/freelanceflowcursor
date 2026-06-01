import { motion, useReducedMotion } from "framer-motion";

export const DASHBOARD_ZOOM_SRC = "/landing/dashboard-screenshot.png";

/** One full loop: holds + 1.2s ease-in-out transitions between states. */
const CYCLE_DURATION = 16.5;

const TIMES = [
  0,
  2 / CYCLE_DURATION,
  3.2 / CYCLE_DURATION,
  5.7 / CYCLE_DURATION,
  6.9 / CYCLE_DURATION,
  9.4 / CYCLE_DURATION,
  10.6 / CYCLE_DURATION,
  12.6 / CYCLE_DURATION,
  13.8 / CYCLE_DURATION,
  15.3 / CYCLE_DURATION,
  1,
] as const;

const SCALE_KEYFRAMES = [1, 1, 1.8, 1.8, 1.8, 1.8, 2.2, 2.2, 1, 1, 1];
const X_KEYFRAMES = ["0%", "0%", "12%", "12%", "-10%", "-10%", "8%", "8%", "0%", "0%", "0%"];
const Y_KEYFRAMES = ["0%", "0%", "10%", "10%", "-8%", "-8%", "-15%", "-15%", "0%", "0%", "0%"];

type DashboardZoomProps = {
  src: string;
  className?: string;
};

export default function DashboardZoom({ src, className }: DashboardZoomProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={className ? `dashboard-zoom ${className}` : "dashboard-zoom"}>
      {reduceMotion ? (
        <img src={src} alt="" className="dashboard-zoom-img" decoding="async" />
      ) : (
        <motion.div
          className="dashboard-zoom-motion"
          animate={{
            scale: SCALE_KEYFRAMES,
            x: X_KEYFRAMES,
            y: Y_KEYFRAMES,
          }}
          transition={{
            duration: CYCLE_DURATION,
            times: [...TIMES],
            ease: "easeInOut",
            repeat: Infinity,
          }}
        >
          <img src={src} alt="" className="dashboard-zoom-img" decoding="async" />
        </motion.div>
      )}
    </div>
  );
}

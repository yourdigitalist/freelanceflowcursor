import { useEffect, useRef, useState } from "react";

export function useIframeAutoHeight(src: string) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(800);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const next = Math.max(
          doc.documentElement.scrollHeight,
          doc.body?.scrollHeight ?? 0,
        );
        if (next > 0) setHeight(next);
      } catch {
        /* cross-origin */
      }
    };

    const onLoad = () => {
      resize();
      const doc = iframe.contentDocument;
      if (!doc) return;
      const ro = new ResizeObserver(resize);
      ro.observe(doc.documentElement);
      iframe.dataset.resizeObserver = "1";
      (iframe as HTMLIFrameElement & { _ro?: ResizeObserver })._ro = ro;
    };

    iframe.addEventListener("load", onLoad);
    window.addEventListener("resize", resize);
    return () => {
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("resize", resize);
      const ro = (iframe as HTMLIFrameElement & { _ro?: ResizeObserver })._ro;
      ro?.disconnect();
    };
  }, [src]);

  return { ref, height };
}

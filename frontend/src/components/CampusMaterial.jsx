import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const LiquidMetal = lazy(() => import("@paper-design/shaders-react").then(module => ({ default: module.LiquidMetal })).catch(() => ({ default: () => null })));

export function CampusMaterial({ variant = "logo", animated = true }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    setEnabled(true);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [reduced]);
  return <span ref={ref} className="campus-material" aria-hidden="true">
    <svg viewBox="0 0 64 64"><path d="M12 54V10h12v17L43 10h15L35 32l24 22H43L24 36v18z" fill={variant === "hero" ? "#3448dd" : "currentColor"} /></svg>
    {enabled && !reduced && <Suspense fallback={null}><LiquidMetal image="/campus-mark.svg" colorBack="#00000000" colorTint={variant === "hero" ? "#8496ff" : "#ffffff"} speed={visible && animated ? 0.5 : 0} scale={0.85} softness={0.2} repetition={2.5} distortion={0.15} contour={0.3} maxPixelCount={variant === "hero" ? 140000 : 16000} style={{ width: "100%", height: "100%" }} /></Suspense>}
  </span>;
}

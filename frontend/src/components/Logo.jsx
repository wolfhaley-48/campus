import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "../navigation";
import { cubeSilhouette } from "../cube";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const reducedSnapshot = () => window.matchMedia(reducedQuery).matches;
const subscribeReduced = callback => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};

function Cube({ size, paused }) {
  const ref = useRef(null);
  const angle = useRef(38 * Math.PI / 180);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    // Supersample the tiny mark, including on a DPR=1 display.
    canvas.width = canvas.height = Math.ceil(size * Math.min(6, Math.max(3, (window.devicePixelRatio || 1) * 3)));
    context.setTransform(canvas.width / 100, 0, 0, canvas.height / 100, 0, 0);
    let frame = 0, last = 0, visible = true;
    const draw = () => {
      context.clearRect(0, 0, 100, 100);
      context.beginPath();
      cubeSilhouette(angle.current).forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.closePath(); context.fillStyle = "#3448dd"; context.fill();
    };
    const tick = time => {
      if (last) angle.current = (angle.current + (time - last) * Math.PI * 2 / 9000) % (Math.PI * 2);
      last = time; draw(); frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame); last = 0;
      if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    draw(); sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [size, paused]);
  return <canvas className="brand-cube" ref={ref} aria-hidden="true" />;
}

export function LogoMark({ size = 38 }) {
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, reducedSnapshot, () => false);
  const label = reduced ? "Логотип Кампуса, движение отключено" : paused ? "Включить вращение логотипа" : "Остановить вращение логотипа";
  return <button type="button" className="brand-mark" style={{ width: size, height: size }}
    onClick={() => setPaused(value => !value)} disabled={!!reduced} aria-label={label} title={label} data-paused={paused || reduced || undefined}>
    <CubeMark size={size} paused={paused || !!reduced} />
  </button>;
}

export function CubeMark({ size = 38, paused = true }) {
  return <>
    <Cube size={size} paused={paused} />
    <svg className="brand-initial" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 47V17h9v11.4L41.4 17H52L37.4 32.2 52.8 47H41.3L29 35.1V47z" fill="currentColor" /></svg>
  </>;
}

export function Brand({ href = "/", subtitle = true }) {
  return <div className="sidebar-brand"><LogoMark /><Link to={href} aria-label="кампус, на главную">
    <span className="brand-word">кампус</span>
    {subtitle && <span className="brand-sub">цифровой деканат</span>}
  </Link></div>;
}

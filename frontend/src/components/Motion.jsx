import { forwardRef, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { ChevronRight } from "../icons";
import { CONTENT_TRANSITION, CONTROL_SPRING } from "../motion";

const SwapPanel = forwardRef(function SwapPanel({ children, direction = 0, ...props }, ref) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  return <motion.div
    {...props}
    ref={ref}
    className="swap-panel"
    aria-hidden={!present || undefined}
    inert={!present ? true : undefined}
    initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : direction * 8 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 0 }}
    transition={reduced ? { duration: 0 } : CONTENT_TRANSITION}
  >{children}</motion.div>;
});

// Animate a measured height, never scale text or interpolate page geometry.
// The height remains measured at rest, so there is no auto-height handoff snap.
export function ContentSwap({ value, children, direction = 0, className = "" }) {
  const content = useRef(null);
  const [height, setHeight] = useState();
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () => setHeight(Number.parseFloat(getComputedStyle(element).height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return <motion.div
    className={`content-swap ${className}`}
    initial={false}
    animate={height === undefined ? {} : { height }}
    transition={reduced ? { duration: 0 } : { ...CONTENT_TRANSITION, duration: 0.24 }}
  >
    <AnimatePresence initial={false} mode="popLayout">
      <SwapPanel key={value} ref={content} direction={direction}>{children}</SwapPanel>
    </AnimatePresence>
  </motion.div>;
}

export function LoadTransition({ phase, children }) {
  return <div className="load-transition">
    <AnimatePresence initial={false} mode="wait">
      <SwapPanel key={phase}>{children}</SwapPanel>
    </AnimatePresence>
  </div>;
}

export function ChoiceGroup({ options, value, onChange, label, className = "segmented", buttonClassName = "segmented-btn", renderOption }) {
  const root = useRef(null);
  const measured = useRef(false);
  const [indicator, setIndicator] = useState(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const element = root.current;
    const measure = () => {
      const selected = element.querySelector('[data-active="true"]');
      if (!selected) return;
      const rect = selected.getBoundingClientRect();
      const parent = element.getBoundingClientRect();
      setIndicator({ x: rect.left - parent.left + element.scrollLeft - element.clientLeft, y: rect.top - parent.top + element.scrollTop - element.clientTop, width: rect.width, height: rect.height });
      if (selected.offsetLeft < element.scrollLeft || selected.offsetLeft + selected.offsetWidth > element.scrollLeft + element.clientWidth) {
        element.scrollTo({ left: selected.offsetLeft - (element.clientWidth - selected.offsetWidth) / 2, behavior: measured.current && !reduced ? "smooth" : "instant" });
      }
      measured.current = true;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.querySelectorAll("button").forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [value, reduced, options.length]);

  return <div ref={root} className={`${className} choice-group`} role="group" aria-label={label}>
    {indicator && <motion.span
      className="choice-indicator"
      aria-hidden="true"
      initial={false}
      animate={indicator}
      transition={reduced ? { duration: 0 } : CONTROL_SPRING}
    />}
    {options.map((option) => <button
      key={option.key}
      type="button"
      className={buttonClassName}
      data-key={option.key}
      data-active={value === option.key ? "true" : undefined}
      data-today={option.today || undefined}
      aria-pressed={value === option.key}
      aria-label={option.ariaLabel}
      disabled={option.disabled}
      onClick={() => onChange(option.key)}
    >{renderOption ? renderOption(option) : <>
      {option.label}
      {option.count !== undefined && <span><AnimatedCount value={option.count} /></span>}
      {option.marker && <span className="segmented-dot" />}
    </>}</button>)}
  </div>;
}

export function Disclosure({ title, children, className = "" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduced = useReducedMotion();
  return <section className={`disclosure ${className}`} data-open={open || undefined}>
    <button className="disclosure-trigger" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <span>{title}</span><ChevronRight size={16} aria-hidden="true" />
    </button>
    <motion.div id={id} className="disclosure-body" aria-hidden={!open} inert={!open ? true : undefined}
      initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      transition={reduced ? { duration: 0 } : CONTENT_TRANSITION}
    >{children}</motion.div>
  </section>;
}

export function AnimatedCount({ value }) {
  const reduced = useReducedMotion();
  return <span className="animated-count" aria-label={String(value)}>
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span key={value} aria-hidden="true"
        initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }}
        transition={reduced ? { duration: 0 } : { duration: 0.16 }}
      >{value}</motion.span>
    </AnimatePresence>
  </span>;
}

export function Spinner({ size = 16 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

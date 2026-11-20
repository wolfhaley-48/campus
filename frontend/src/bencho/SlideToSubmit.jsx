import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { ArrowRight, Check } from "../icons";
import { Spinner } from "../components/Motion";

import "./SlideToSubmit.css";

/*
  Адаптация Bencho SlideConfirm (MIT, bencho.dev): ручка, которую
  сдвигают до отметки. После подтверждения она раскрывается и
  заполняет трек. Отличия: русский текст, управляемая ширина,
  async onConfirm и сброс при ошибке.
*/

const HEIGHT = 56;
const PAD = 4;
const GRIP = HEIGHT - PAD * 2;
const THRESHOLD = 0.66;

export function SlideToSubmit({
  onConfirm,
  label = "Сдвиньте, чтобы отправить",
  doneLabel = "Отправлено",
  disabled = false,
  resetKey = 0,
}) {
  const trackRef = useRef(null);
  const drag = useRef(null);
  const pending = useRef(false);
  const [width, setWidth] = useState(320);
  const [held, setHeld] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const reduced = useReducedMotion();

  const x = useMotionValue(0);
  const handleWidth = useMotionValue(GRIP);

  const travel = Math.max(0, width - GRIP - PAD * 2);
  const mark = travel * THRESHOLD;
  const fullWidth = Math.max(GRIP, width - PAD * 2);

  const washWidth = useTransform([x, handleWidth], ([latestX, latestWidth]) =>
    Math.min(width - PAD * 2, latestX + latestWidth),
  );
  const sayOpacity = useTransform(x, [0, Math.max(1, mark * 0.7)], [1, 0]);

  useLayoutEffect(() => {
    const element = trackRef.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth || 320);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setDone(false);
    setBusy(false);
    setHeld(false);
    pending.current = false;
    drag.current = null;
    x.set(0);
    handleWidth.set(GRIP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    drag.current = null;
    setHeld(false);
    x.set(0);
    handleWidth.set(done ? Math.max(GRIP, width - PAD * 2) : GRIP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const spring = reduced
    ? { duration: 0.01 }
    : { type: "spring", mass: 0.8, stiffness: 440, damping: 38 };

  const resetPosition = () => {
    setDone(false);
    setBusy(false);
    animate(handleWidth, GRIP, spring);
    animate(x, 0, spring);
  };

  const finish = async () => {
    if (pending.current || disabled || done) return;
    if (x.get() < mark) {
      animate(x, 0, spring);
      return;
    }
    pending.current = true;
    setDone(true);
    setBusy(true);
    animate(x, 0, spring);
    animate(handleWidth, fullWidth, spring);
    try {
      await onConfirm?.();
      setBusy(false);
    } catch {
      resetPosition();
    } finally {
      pending.current = false;
    }
  };

  const down = (event) => {
    if (disabled || busy || done) return;
    trackRef.current?.setPointerCapture?.(event.pointerId);
    drag.current = {
      id: event.pointerId,
      start: event.clientX,
      base: x.get(),
    };
    setHeld(true);
  };

  const move = (event) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const next = Math.min(
      travel,
      Math.max(0, drag.current.base + (event.clientX - drag.current.start)),
    );
    x.set(next);
  };

  const up = (event) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    try {
      trackRef.current?.releasePointerCapture?.(event.pointerId);
    } catch {
      // pointer уже отпущен
    }
    drag.current = null;
    setHeld(false);
    finish();
  };

  const cancel = (event) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    drag.current = null;
    setHeld(false);
    animate(x, 0, spring);
  };

  const onKeyDown = (event) => {
    if (disabled || busy || done) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      x.set(travel);
      finish();
    }
  };

  return (
    <div
      className="ss"
      data-done={done ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      aria-busy={busy}
    >
      <div
        className="ss-track"
        ref={trackRef}
        data-held={held ? "true" : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
      >
        <motion.i className="ss-wash" aria-hidden="true" style={{ width: washWidth }} />

        <motion.span className="ss-say" style={{ opacity: sayOpacity }}>
          {label}
        </motion.span>

        <motion.button
          type="button"
          className="ss-grip"
          style={{ x, width: handleWidth }}
          onKeyDown={onKeyDown}
          onClick={(event) => { if (event.detail === 0 && !pending.current && !done && !disabled) { x.set(travel); finish(); } }}
          disabled={disabled || busy || done}
          aria-label={busy ? "Отправляем заявку" : done ? doneLabel : `${label}. Можно сдвинуть или нажать Enter`}
        >
          {!done ? (
            <span className="ss-arrow" aria-hidden="true">
              <ArrowRight size={20} strokeWidth={2.2} />
            </span>
          ) : (
            <span className="ss-done" aria-hidden="true">
              {busy ? <Spinner size={18} /> : <Check size={18} strokeWidth={2.4} />}
              {busy ? "Отправляем" : doneLabel}
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}

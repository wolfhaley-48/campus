import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimationControls, useDragControls, useIsPresent, useMotionValue, useReducedMotion } from "framer-motion";
import { ShieldCheck, X } from "../icons";
import { api } from "../api";
import { useAuth } from "../auth";
import { SlideToSubmit } from "../bencho/SlideToSubmit";
import { ContentSwap } from "./Motion";
import { SHEET_SPRING, shouldCloseSheet } from "../motion";
import { useToast } from "../toast";

function RequestDialog({ onClose, types, delivery, onCreated }) {
  const [type, setType] = useState(types?.[0]?.key || "");
  const [mode, setMode] = useState("electronic");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 720px)").matches);
  const { toast } = useToast();
  const { refreshUnread } = useAuth();
  const dialogRef = useRef(null);
  const backdropRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(false);
  const openingDrag = useRef(false);
  const controls = useAnimationControls();
  const drag = useDragControls();
  const y = useMotionValue(0);
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const selectedType = types?.find((item) => item.key === type);
  closeRef.current = onClose;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      backdropRef.current?.style.setProperty("--dialog-height", `${viewport?.height || innerHeight}px`);
      backdropRef.current?.style.setProperty("--dialog-top", `${viewport?.offsetTop || 0}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    controls.start("open");
    return () => controls.stop();
  }, [controls]);

  // This component remains mounted through its exit animation. Keep the focus
  // trap, scroll lock and background isolation until the sheet is really gone.
  useEffect(() => {
    const opener = document.activeElement;
    const root = document.getElementById("root");
    const wasInert = root.inert;
    const overflow = document.body.style.overflow;
    root.inert = true;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const nodes = [...dialog.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex="0"]')]
        .filter((element) => element.getClientRects().length && (element.type !== "radio" || element.checked));
      const first = nodes[0];
      const last = nodes.at(-1);
      const active = document.activeElement;
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (!dialog.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && (active === first || active === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      root.inert = wasInert;
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKeyDown);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const submit = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSending(true);
    try {
      const data = await api.post("/requests", { type, delivery: mode, comment });
      refreshUnread();
      toast({ kind: "success", title: "Заявка создана", body: data.request.number });
      onCreated?.(data.request);
    } catch (error) {
      toast({ kind: "error", title: "Не удалось создать заявку", body: error.message });
      throw error;
    } finally {
      busyRef.current = false;
      setSending(false);
    }
  };

  const beginDrag = (event) => {
    if (!mobile || busyRef.current || !present || event.target.closest("button")) return;
    const displacement = dialogRef.current.getBoundingClientRect().bottom - backdropRef.current.getBoundingClientRect().bottom;
    controls.stop();
    y.set(Math.max(0, displacement));
    openingDrag.current = false;
    drag.start(event);
  };
  const endDrag = (_, info) => {
    const close = shouldCloseSheet({ height: dialogRef.current.offsetHeight, viewportHeight: backdropRef.current.clientHeight, displacement: y.get(), velocity: info.velocity.y, opening: openingDrag.current });
    if (close) onClose();
    else controls.start("open");
  };

  return <motion.div className="modal-backdrop" ref={backdropRef}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={{ duration: reduced ? 0 : 0.2 }}
    onPointerDown={(event) => { if (event.target === event.currentTarget && !sending) onClose(); }}
  >
    <motion.div className="modal" role="dialog" aria-modal="true" aria-busy={sending} aria-labelledby="new-request-title" aria-describedby="new-request-desc" aria-hidden={!present || undefined} inert={!present ? true : undefined} tabIndex={-1} ref={dialogRef}
      style={{ y }} initial="closed" animate={controls} exit="closed"
      variants={{ open: { opacity: 1, y: 0 }, closed: { opacity: mobile && !reduced ? 1 : 0, y: reduced ? 0 : mobile ? "100%" : 24 } }}
      transition={reduced ? { duration: 0 } : { y: SHEET_SPRING, opacity: { duration: 0.18 } }}
      drag={mobile && !sending ? "y" : false} dragControls={drag} dragListener={false}
      dragConstraints={{ top: 0, bottom: window.innerHeight }} dragElastic={0} dragMomentum={false}
      onDrag={(_, info) => { if (info.delta.y) openingDrag.current = info.delta.y < 0; }} onDragEnd={endDrag}
    >
      <div className="modal-drag-zone" aria-hidden="true" onPointerDown={beginDrag}><span className="modal-handle" /></div>
      <header className="modal-head" onPointerDown={beginDrag}>
        <div><h2 id="new-request-title">Новая заявка</h2><p id="new-request-desc">Выберите документ и способ получения.</p></div>
        <button type="button" className="icon-btn" disabled={sending} onClick={onClose} aria-label="Закрыть"><X size={18} aria-hidden="true" /></button>
      </header>

      <div className="modal-body">
        <span className="field-label">Что нужно</span>
        <div className="request-type-grid" role="radiogroup" aria-label="Тип заявки" aria-describedby="request-type-description">
          {(types || []).map((item) => <label key={item.key} className="type-option" data-active={item.key === type || undefined}>
            <input type="radio" name="request-type" className="type-option-radio" value={item.key} disabled={sending} checked={item.key === type} onChange={() => setType(item.key)} />
            <span className="type-option-text"><b>{item.label}</b></span><span className="type-option-eta">{item.eta}</span>
          </label>)}
        </div>
        <div className="type-description" id="request-type-description"><ContentSwap value={type}><p>{selectedType?.description}</p></ContentSwap></div>

        <span className="field-label">Как получить</span>
        <div className="delivery-toggle" role="radiogroup" aria-label="Способ получения">
          {(delivery || []).map((item) => <label key={item.key} className="delivery-option" data-active={mode === item.key || undefined}>
            <input type="radio" name="request-delivery" value={item.key} disabled={sending} checked={mode === item.key} onChange={() => setMode(item.key)} />{item.label}
          </label>)}
        </div>
        <label className="field-label" htmlFor="request-comment">Комментарий <span>необязательно</span></label>
        <textarea id="request-comment" className="textarea" disabled={sending} maxLength={600} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Например, для предоставления в банк" rows={3} />
        <span className="char-count">{comment.length} / 600</span>
        <div className="modal-note"><ShieldCheck size={15} aria-hidden="true" />Заявка будет отправлена от вашего имени.</div>
      </div>

      <footer className="modal-foot">
        <SlideToSubmit resetKey={`${type}-${mode}`} onConfirm={submit} label="Сдвиньте, чтобы отправить" doneLabel="Заявка создана" disabled={!type} />
        <p className="modal-disclaimer">В демо статус заявки не меняется автоматически.</p>
      </footer>
    </motion.div>
  </motion.div>;
}

export function NewRequestModal({ open, onExitComplete, ...props }) {
  return createPortal(<AnimatePresence onExitComplete={onExitComplete}>{open && <RequestDialog key="new-request" {...props} />}</AnimatePresence>, document.body);
}

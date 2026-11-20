import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, X } from "./icons";

const ToastContext = createContext(null);

let nextId = 1;

const ICONS = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const reduced = useReducedMotion();

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ kind = "info", title, body, duration = 4600 }) => {
      const id = nextId++;
      setToasts((items) => [...items.slice(-2), { id, kind, title, body }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(<div className="toaster" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((item) => {
            const Icon = ICONS[item.kind] || Info;
            return (
              <motion.div
                key={item.id}
                className="toast"
                data-kind={item.kind}
                role="status"
                layout="position"
                initial={{ opacity: 0, y: reduced ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : 8 }}
                transition={reduced ? { duration: 0 } : { type: "spring", mass: 0.8, stiffness: 440, damping: 38 }}
              >
                <span className="toast-icon">
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="toast-text">
                  <strong>{item.title}</strong>
                  {item.body && <span>{item.body}</span>}
                </span>
                <button
                  type="button"
                  className="toast-close"
                  onClick={() => dismiss(item.id)}
                  aria-label="Закрыть уведомление"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast должен вызываться внутри ToastProvider");
  return context;
}

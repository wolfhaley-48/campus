import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

const NavigationContext = createContext(null);
const NativeMotionContext = createContext(null);

function canTransition() {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function"
  );
}

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isPlainLeftClick(event) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  );
}

export function NavigationProvider({ children }) {
  const routerNavigate = useNavigate();
  const activeRef = useRef(null);
  const nativeRef = useRef(false);
  const generation = useRef(0);
  const { pathname } = useLocation();

  useEffect(() => {
    const interrupt = () => {
      generation.current += 1;
      activeRef.current?.skipTransition();
      activeRef.current = null;
      nativeRef.current = false;
    };
    window.addEventListener("popstate", interrupt);
    return () => window.removeEventListener("popstate", interrupt);
  }, []);

  const navigate = useCallback(
    (to, options = {}) => {
      const { viewTransition = true, ...routerOptions } = options;
      const id = ++generation.current;
      activeRef.current?.skipTransition();
      activeRef.current = null;
      nativeRef.current = false;
      const useTransition =
        viewTransition &&
        canTransition() &&
        !reducedMotion() &&
        pathname !== "/login" && to !== "/login" &&
        typeof to !== "number";

      if (!useTransition) {
        routerNavigate(to, routerOptions);
        return;
      }

      nativeRef.current = true;

      try {
        const transition = document.startViewTransition(() => {
          if (id === generation.current) flushSync(() => routerNavigate(to, routerOptions));
        });
        activeRef.current = transition;

        // ready rejects when the browser skips a transition (e.g. on resize).
        transition.ready.catch(() => {});
        transition.updateCallbackDone.catch(() => {});
        transition.finished
          .catch(() => {
            // Переход мог быть пропущен браузером — навигация уже произошла.
          })
          .finally(() => {
            if (activeRef.current === transition) {
              activeRef.current = null;
              nativeRef.current = false;
            }
          });
      } catch {
        activeRef.current = null;
        nativeRef.current = false;
        routerNavigate(to, routerOptions);
      }
    },
    [routerNavigate, pathname],
  );

  return (
    <NavigationContext.Provider value={navigate}>
      <NativeMotionContext.Provider value={nativeRef}>{children}</NativeMotionContext.Provider>
    </NavigationContext.Provider>
  );
}

export function useNativeNavigation() {
  return useContext(NativeMotionContext);
}

export function useAppNavigate() {
  const navigate = useContext(NavigationContext);

  if (!navigate) {
    throw new Error("useAppNavigate() must be used inside <NavigationProvider>");
  }

  return navigate;
}

export function Link({
  to,
  replace,
  state,
  relative,
  preventScrollReset,
  reloadDocument,
  target,
  onClick,
  children,
  ...props
}) {
  const navigate = useAppNavigate();
  const location = useLocation();

  const handleClick = (event) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      !isPlainLeftClick(event) ||
      (target && target !== "_self") ||
      reloadDocument ||
      event.currentTarget.hasAttribute("download") ||
      event.currentTarget.origin !== window.location.origin
    ) {
      return;
    }

    const url = new URL(event.currentTarget.href, window.location.href);
    const samePage =
      url.pathname === location.pathname && url.search === location.search;
    const sameUrl =
      samePage && url.hash === location.hash;

    // Ссылки на тот же URL и якоря внутри страницы пусть обрабатывает браузер.
    if (sameUrl || (samePage && url.hash)) return;

    event.preventDefault();

    // Открытие модалки — это изменение query, а не смена страницы.
    // Такой переход не должен анимировать весь контент.
    const viewTransition = url.pathname !== location.pathname;

    navigate(to, {
      replace,
      state,
      relative,
      preventScrollReset,
      viewTransition,
    });
  };

  return (
    <RouterLink
      to={to}
      replace={replace}
      state={state}
      relative={relative}
      preventScrollReset={preventScrollReset}
      reloadDocument={reloadDocument}
      target={target}
      onClick={handleClick}
      {...props}
    >
      {children}
    </RouterLink>
  );
}

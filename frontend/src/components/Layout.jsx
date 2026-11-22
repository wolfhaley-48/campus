import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Bell, CalendarDays, FileText, GraduationCap, LayoutDashboard, Messages } from "../icons";
import { Link, useNativeNavigation } from "../navigation";
import { useAuth } from "../auth";
import { AssistantDock } from "./AssistantDock";
import { Avatar } from "./Avatar";
import { CubeMark, LogoMark } from "./Logo";
import { FullscreenLoader, PageSkeleton } from "./States";
import { AnimatedCount } from "./Motion";
import { CONTENT_TRANSITION } from "../motion";

const NAV = [
  { to: "/", label: "Главная", icon: LayoutDashboard },
  { to: "/schedule", label: "Расписание", icon: CalendarDays },
  { to: "/grades", label: "Успеваемость", icon: GraduationCap },
  { to: "/requests", label: "Заявки", icon: FileText },
  { to: "/notifications", label: "Уведомления", icon: Bell },
  { to: "/social", label: "Социалка", icon: Messages },
];

function AppHeader() {
  const { pathname } = useLocation();
  const { user, unread } = useAuth();
  const tabsRef = useRef(null);
  const firstMeasure = useRef(true);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const tabs = tabsRef.current;
    const active = tabs.querySelector('[aria-current="page"]');
    const measure = () => {
      tabs.style.setProperty("--pill-width", `${active?.offsetWidth || 0}px`);
      tabs.style.setProperty("--pill-opacity", active ? "1" : "0");
      if (!active) return;
      tabs.style.setProperty("--pill-left", `${active.offsetLeft}px`);
      const left = active.offsetLeft;
      if (left < tabs.scrollLeft || left + active.offsetWidth > tabs.scrollLeft + tabs.clientWidth) {
        tabs.scrollTo({ left: left - (tabs.clientWidth - active.offsetWidth) / 2, behavior: firstMeasure.current || reduced ? "instant" : "smooth" });
      }
      firstMeasure.current = false;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    tabs.querySelectorAll("a").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname, reduced]);

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="header-brand"><LogoMark size={34} /><Link to="/" aria-label="Кампус, на главную">кампус</Link></div>
          <nav ref={tabsRef} className="header-tabs" aria-label="Основная навигация">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
              return <Link key={to} to={to} className="header-tab" aria-label={label} aria-current={active ? "page" : undefined}>
                <Icon size={18} /><span className="nav-label-full">{label}</span><span className="nav-label-short" aria-hidden="true">{to === "/grades" ? "Учёба" : to === "/notifications" ? "Уведы" : to === "/schedule" ? "Пары" : label}</span>
                {to === "/notifications" && <AnimatePresence initial={false}>
                  {unread > 0 && <motion.span className="header-badge" initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={reduced ? { duration: 0 } : CONTENT_TRANSITION}>
                    <AnimatedCount value={unread > 9 ? "9+" : unread} />
                  </motion.span>}
                </AnimatePresence>}
              </Link>;
            })}
          </nav>
          <Link to="/profile" className="header-profile" aria-label="Профиль" aria-current={pathname === "/profile" ? "page" : undefined}>
            <Avatar user={user} size="sm" eager />
          </Link>
        </div>
      </header>
    </>
  );
}

function RouteStage() {
  const { pathname } = useLocation();
  const native = useNativeNavigation();
  const reduced = useReducedMotion();
  return <motion.div key={pathname} className="route-stage"
    initial={native.current || reduced ? false : { opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }} transition={reduced ? { duration: 0 } : CONTENT_TRANSITION}
  ><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></motion.div>;
}

export default function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const assistantInput = useRef(null);
  const assistantTrigger = useRef(null);
  const toggleAssistant = () => {
    if (assistantOpen) {
      setAssistantOpen(false);
      assistantTrigger.current?.focus();
    } else {
      // Reveal the dock before focusing, within the opening gesture.
      flushSync(() => setAssistantOpen(true));
      assistantInput.current?.focus();
    }
  };
  useLayoutEffect(() => {
    // scrollTo can return a Promise; an effect must not return it as cleanup.
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector(".main-inner")?.scrollTo({ top: 0, behavior: "instant" });
    setAssistantOpen(false);
  }, [location.pathname]);
  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <div className="shell" data-risk={user.academicRisk || undefined}>
    <a className="skip-link" href="#main-content">Перейти к содержимому</a>
    <AppHeader />
    <main className="main-inner" id="main-content"><RouteStage /></main>
    <div className="dock-reserve" aria-hidden="true" />
    <button ref={assistantTrigger} type="button" className="brand-mark assistant-launcher"
      hidden={assistantOpen} onClick={toggleAssistant} aria-label="Открыть панель помощника"
      aria-expanded={assistantOpen} aria-controls="assistant-panel">
      <CubeMark size={56} />
    </button>
    <AssistantDock expanded={assistantOpen} setExpanded={setAssistantOpen} input={assistantInput} launcher={assistantTrigger} />
    <footer className="app-footer"><span>Кампус · демо</span><span>Неофициальный сервис. Все данные вымышлены.</span></footer>
  </div>;
}

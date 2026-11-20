import { useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Bell, CalendarDays, FileText, GraduationCap, LayoutDashboard } from "../icons";
import { Link, useNativeNavigation } from "../navigation";
import { useAuth } from "../auth";
import { Avatar } from "./Avatar";
import { LogoMark } from "./Logo";
import { FullscreenLoader } from "./States";
import { AnimatedCount } from "./Motion";
import { CONTENT_TRANSITION } from "../motion";

const NAV = [
  { to: "/", label: "Главная", icon: LayoutDashboard },
  { to: "/schedule", label: "Расписание", icon: CalendarDays },
  { to: "/grades", label: "Успеваемость", icon: GraduationCap },
  { to: "/requests", label: "Заявки", icon: FileText },
  { to: "/notifications", label: "Уведомления", icon: Bell },
];

const BLUR = [[1, 62, 100], [2, 56, 96], [3, 50, 92], [5, 44, 86], [8, 36, 78], [12, 28, 68], [18, 20, 56], [26, 10, 44]];

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
      <div className="header-veil" aria-hidden="true">
        {BLUR.map(([radius, solid, end]) => <i key={radius} style={{ "--blur": `${radius}px`, "--solid": `${solid}%`, "--end": `${end}%` }} />)}
        <span />
      </div>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="header-brand" aria-label="Кампус, на главную">
            <LogoMark size={34} /><span>кампус</span>
          </Link>
          <nav ref={tabsRef} className="header-tabs" aria-label="Основная навигация">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
              return <Link key={to} to={to} className="header-tab" aria-current={active ? "page" : undefined}>
                <Icon size={18} /><span>{label}</span>
                {to === "/notifications" && <AnimatePresence initial={false}>
                  {unread > 0 && <motion.span className="header-badge" initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={reduced ? { duration: 0 } : CONTENT_TRANSITION}>
                    <AnimatedCount value={unread > 9 ? "9+" : unread} />
                  </motion.span>}
                </AnimatePresence>}
              </Link>;
            })}
          </nav>
          <Link to="/profile" className="header-profile" aria-label="Профиль" aria-current={pathname === "/profile" ? "page" : undefined}>
            <Avatar user={user} size="sm" />
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
  ><Outlet /></motion.div>;
}

export default function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  useLayoutEffect(() => {
    // scrollTo can return a Promise; an effect must not return it as cleanup.
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <div className="shell">
    <a className="skip-link" href="#main-content">Перейти к содержимому</a>
    <AppHeader />
    <main className="main-inner" id="main-content"><RouteStage /></main>
    <footer className="app-footer"><span>Кампус · демо</span><span>Неофициальный сервис. Все данные вымышлены.</span></footer>
  </div>;
}

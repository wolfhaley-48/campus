import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { api } from "../api";

const LIMIT = 5200;
const MAX_WEEKS = 5;

export function ScheduleRail({ initialData, offset, renderDay }) {
  const [weeks, setWeeks] = useState([{ offset, data: initialData }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const root = useRef(null),
    start = useRef(null),
    end = useRef(null);
  const busy = useRef(false),
    alive = useRef(true),
    anchor = useRef(null),
    lastDirection = useRef(1);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(
    async (direction) => {
      const next =
        (direction < 0 ? weeks[0].offset : weeks.at(-1).offset) + direction;
      if (busy.current || Math.abs(next) > LIMIT) return;
      busy.current = true;
      lastDirection.current = direction;
      setLoading(true);
      setError("");
      try {
        const data = await api.get(`/schedule?week=${next}`);
        if (!alive.current) return;
        const viewport = root.current;
        const firstVisible = [...viewport.querySelectorAll("[data-date]")].find(
          (el) => el.offsetLeft + el.offsetWidth > viewport.scrollLeft,
        );
        anchor.current = firstVisible
          ? {
              date: firstVisible.dataset.date,
              left: firstVisible.offsetLeft - viewport.scrollLeft,
            }
          : null;
        setWeeks((current) => {
          const result =
            direction < 0
              ? [{ offset: next, data }, ...current]
              : [...current, { offset: next, data }];
          return direction < 0
            ? result.slice(0, MAX_WEEKS)
            : result.slice(-MAX_WEEKS);
        });
      } catch (failure) {
        if (alive.current) setError(failure.message);
      } finally {
        busy.current = false;
        if (alive.current) setLoading(false);
      }
    },
    [weeks],
  );

  useLayoutEffect(() => {
    if (!anchor.current) return;
    const day = root.current.querySelector(
      `[data-date="${anchor.current.date}"]`,
    );
    if (day) root.current.scrollLeft = day.offsetLeft - anchor.current.left;
    anchor.current = null;
  }, [weeks]);

  useEffect(() => {
    if (loading || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) load(visible.target === start.current ? -1 : 1);
      },
      { root: root.current, rootMargin: "0px 240px", threshold: 0 },
    );
    observer.observe(start.current);
    observer.observe(end.current);
    return () => observer.disconnect();
  }, [load, loading, error]);

  return (
    <>
      <div className="rail-status" role="status">
        {error ? (
          <>
            <span>{error}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => load(lastDirection.current)}
            >
              Повторить загрузку
            </button>
          </>
        ) : loading ? (
          "Подгружаем дни…"
        ) : (
          "Листай в обе стороны — дни подгружаются автоматически"
        )}
      </div>
      <div
        ref={root}
        className="week-board panel-week-board schedule-rail"
        role="region"
        aria-label="Расписание на неделю"
        tabIndex={0}
        aria-busy={loading}
      >
        <div className="schedule-rail-track">
          <span ref={start} className="rail-sentinel" aria-hidden="true" />
          {weeks.flatMap((week) => week.data.days.map((day) => renderDay(day)))}
          <span ref={end} className="rail-sentinel" aria-hidden="true" />
        </div>
      </div>
    </>
  );
}

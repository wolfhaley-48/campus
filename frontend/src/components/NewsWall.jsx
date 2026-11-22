import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { api } from "../api";
import { Avatar } from "./Avatar";

export function NewsWall() {
  const [items, setItems] = useState([]),
    [cursor, setCursor] = useState(null),
    [more, setMore] = useState(true),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [draft, setDraft] = useState(""),
    [scope, setScope] = useState("group"),
    [sending, setSending] = useState(false),
    [sendError, setSendError] = useState(""),
    [trimmed, setTrimmed] = useState(false);
  const end = useRef(null),
    wall = useRef(null),
    busy = useRef(false),
    alive = useRef(true),
    anchor = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    if (busy.current || !more) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const data = await api.get(
        "/social/feed" + (cursor ? `?before=${cursor}` : ""),
      );
      if (!alive.current) return;
      const scroller = wall.current.closest(".main-inner");
      const first = [...wall.current.querySelectorAll("[data-post]")].find(
        (el) =>
          el.getBoundingClientRect().bottom >
          scroller.getBoundingClientRect().top,
      );
      if (first)
        anchor.current = {
          id: first.dataset.post,
          top: first.getBoundingClientRect().top,
        };
      setItems((current) => {
        const all = [...current, ...data.items];
        const unique = [
          ...new Map(all.map((item) => [item.id, item])).values(),
        ];
        if (unique.length > 60) setTrimmed(true);
        return unique.slice(-60);
      });
      setCursor(data.nextCursor);
      setMore(data.hasMore);
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      busy.current = false;
      if (alive.current) setLoading(false);
    }
  }, [cursor, more]);
  useEffect(() => {
    if (loading || error || !more) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) load();
      },
      { root: wall.current.closest(".main-inner"), rootMargin: "200px" },
    );
    observer.observe(end.current);
    return () => observer.disconnect();
  }, [load, loading, error, more]);
  useLayoutEffect(() => {
    if (anchor.current) {
      const el = wall.current.querySelector(
        `[data-post="${anchor.current.id}"]`,
      );
      if (el)
        wall.current.closest(".main-inner").scrollTop +=
          el.getBoundingClientRect().top - anchor.current.top;
      anchor.current = null;
    }
  }, [items]);
  const publish = async (event) => {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setSendError("");
    try {
      const data = await api.post("/social/feed", { body: draft, scope });
      setItems((current) => [data.item, ...current].slice(0, 60));
      setDraft("");
    } catch (e) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };
  const reset = () => {
    if (busy.current) return;
    setItems([]);
    setCursor(null);
    setMore(true);
    setError("");
    setTrimmed(false);
    wall.current.scrollIntoView({ block: "start" });
  };
  return (
    <section ref={wall} className="news-wall" aria-label="Стена новостей">
      <header className="wall-heading">
        <h2>Что движется в кампусе</h2>
        <span>Стена · демо</span>
      </header>
      <details className="wall-publish">
        <summary>Кинуть пост на стену ↗</summary>
        <form onSubmit={publish} className="wall-compose">
          <label htmlFor="wall-draft">Есть что рассказать?</label>
          <textarea
            id="wall-draft"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ищешь команду, зовёшь на движ или делишься находкой?"
            disabled={sending}
          />
          <div>
            <label className="sr-only" htmlFor="wall-scope">
              Кто увидит пост
            </label>
            <select
              id="wall-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="group">Моя группа</option>
              <option value="all">Весь кампус</option>
            </select>
            <button
              className="btn btn-primary"
              disabled={sending || !draft.trim()}
            >
              {sending ? "Публикуем…" : "На стену"}
            </button>
          </div>
          {sendError && <p role="alert">{sendError}</p>}
        </form>
      </details>
      {trimmed && (
        <button className="btn wall-reset" disabled={loading} onClick={reset}>
          К новым постам ↑
        </button>
      )}
      <div className="wall-posts">
        {items.map((item) => (
          <article className="wall-post" key={item.id} data-post={item.id}>
            <header>
              <Avatar user={item.author} size="sm" />
              <div>
                <b>{item.author.fullName}</b>
                <small>
                  {item.scope === "group" ? "Для своей группы" : "Весь кампус"}{" "}
                  ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  })}
                </small>
              </div>
            </header>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
      {trimmed && (
        <button className="btn wall-reset" disabled={loading} onClick={reset}>
          К новым постам ↑
        </button>
      )}
      <div ref={end} className="wall-end" role="status">
        {loading ? (
          "Ловим следующие посты…"
        ) : error ? (
          <>
            <p>{error}</p>
            <button className="btn" onClick={load}>
              Загрузить посты ещё раз
            </button>
          </>
        ) : more ? (
          <button className="btn" onClick={load}>
            Ещё посты
          </button>
        ) : (
          "Ты всё видел. Новые посты появятся здесь."
        )}
      </div>
    </section>
  );
}

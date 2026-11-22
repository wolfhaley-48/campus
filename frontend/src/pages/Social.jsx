import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useApi } from "../useApi";
import { useAuth } from "../auth";
import { PageHeader } from "../components/PageHeader";
import { ErrorState } from "../components/States";
import { Avatar } from "../components/Avatar";
import { PaperBurst } from "../components/PaperBurst";
import { plural } from "../utils";

const merge = (a, b) =>
  [...new Map([...a, ...b].map((item) => [item.id, item])).values()].sort(
    (x, y) => x.id.localeCompare(y.id),
  );
export default function Social() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data, error, reload } = useApi("/social/threads");
  const selected =
    data?.threads.find((item) => item.id === params.get("thread")) ||
    data?.threads[0];
  const channel = selected?.id;
  const path = channel ? "/social/threads/" + encodeURIComponent(channel) : "";
  const [messages, setMessages] = useState([]),
    [older, setOlder] = useState(null),
    [draft, setDraft] = useState(""),
    [failure, setFailure] = useState(""),
    [loadFailure, setLoadFailure] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [burst, setBurst] = useState(0),
    [unseen, setUnseen] = useState(false);
  const view = useRef(null),
    pending = useRef(null),
    latest = useRef(""),
    scroll = useRef(null),
    generation = useRef(0),
    refresh = useRef(null),
    readId = useRef(""),
    historyBusy = useRef(false);
  const markRead = async () => {
    const last = latest.current;
    if (!last || readId.current === last || document.hidden) return;
    readId.current = last;
    try {
      await api.post(path + "/read", { lastId: last });
      reload();
    } catch {
      readId.current = "";
    }
  };
  useEffect(() => {
    if (!channel) return;
    const id = ++generation.current;
    let active = true,
      fetching = false,
      initial = true;
    latest.current = "";
    readId.current = "";
    setUnseen(false);
    setMessages([]);
    setOlder(null);
    setDraft("");
    setFailure("");
    setLoadFailure("");
    setLoading(true);
    const fetchMessages = async () => {
      if (document.hidden || fetching) return;
      fetching = true;
      try {
        const result = await api.get(
          path +
            "/messages" +
            (latest.current ? "?after=" + latest.current : ""),
        );
        if (!active) return;
        setLoadFailure("");
        if (result.items.length) {
          const last = result.items.at(-1).id;
          const atBottom =
            !view.current ||
            view.current.scrollHeight -
              view.current.scrollTop -
              view.current.clientHeight <
              100;
          latest.current = last > latest.current ? last : latest.current;
          if (atBottom) scroll.current = "bottom";
          setMessages((current) => merge(current, result.items));
          if (atBottom) {
            setUnseen(false);
            await markRead();
          } else setUnseen(true);
        }
        if (initial) {
          setOlder(result.hasMore ? result.nextCursor : null);
          initial = false;
        }
      } catch (e) {
        if (active) setLoadFailure(e.message);
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    };
    refresh.current = fetchMessages;
    fetchMessages();
    const timer = setInterval(fetchMessages, 5000);
    const visible = () => {
      if (!document.hidden) fetchMessages();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      if (generation.current === id) generation.current++;
    };
  }, [channel]);
  useLayoutEffect(() => {
    if (!view.current) return;
    if (scroll.current === "bottom")
      view.current.scrollTop = view.current.scrollHeight;
    else if (scroll.current)
      view.current.scrollTop +=
        view.current.scrollHeight - scroll.current.height;
    scroll.current = null;
  }, [messages]);
  const send = async (event) => {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    const id = generation.current;
    setBusy(true);
    setFailure("");
    if (
      !pending.current ||
      pending.current.body !== draft ||
      pending.current.channel !== channel
    )
      pending.current = { body: draft, channel, clientId: crypto.randomUUID() };
    try {
      const result = await api.post(path + "/messages", {
        body: draft,
        clientId: pending.current.clientId,
      });
      if (id === generation.current) {
        scroll.current = "bottom";
        setMessages((current) => merge(current, [result.item]));
        latest.current =
          result.item.id > latest.current ? result.item.id : latest.current;
        setDraft("");
        pending.current = null;
        setBurst((value) => value + 1);
        reload();
      }
    } catch (e) {
      if (id === generation.current) setFailure(e.message);
    } finally {
      setBusy(false);
    }
  };
  const loadOlder = async () => {
    if (!older || historyBusy.current) return;
    historyBusy.current = true;
    setLoading(true);
    setLoadFailure("");
    const id = generation.current;
    try {
      const result = await api.get(path + "/messages?before=" + older);
      if (id !== generation.current) return;
      scroll.current = { height: view.current.scrollHeight };
      setMessages((current) => merge(result.items, current));
      setOlder(result.hasMore ? result.nextCursor : null);
    } catch (e) {
      if (id === generation.current) setLoadFailure(e.message);
    } finally {
      historyBusy.current = false;
      setLoading(false);
    }
  };
  return (
    <div className="page social-page">
      <PageHeader
        title="Социалка"
        subtitle="Свои люди, общий движ. Демо-переписка хранится в аккаунте."
      />
      {error ? (
        <ErrorState onRetry={reload} />
      ) : !data ? (
        <p role="status">Ищем твои чаты…</p>
      ) : (
        <div className="social-layout">
          <nav className="thread-list" aria-label="Диалоги">
            {data.threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                aria-pressed={channel === thread.id}
                onClick={() => setParams({ thread: thread.id })}
              >
                {thread.peer ? (
                  <Avatar user={thread.peer} size="sm" />
                ) : (
                  <span className="group-sign" aria-hidden="true">
                    #
                  </span>
                )}
                <span>
                  <b>{thread.kind === "group" ? "Чат группы" : thread.title}</b>
                  <small>
                    {thread.kind === "group" ? user.group : "Личка"} ·{" "}
                    {thread.unread || 0}{" "}
                    {plural(thread.unread || 0, "новое", "новых", "новых")}
                  </small>
                  <span className="thread-preview">{thread.preview}</span>
                </span>
              </button>
            ))}
          </nav>
          <section className="conversation" aria-label={selected?.title}>
            <header>
              <h2>
                {selected?.kind === "group" ? "Чат группы" : selected?.title}
              </h2>
              <span>{selected?.kind === "group" ? user.group : "Личка"}</span>
            </header>
            <div
              className="messages"
              ref={view}
              role="log"
              aria-label="История сообщений"
              aria-live="polite"
              onScroll={() => {
                const el = view.current;
                if (
                  el &&
                  el.scrollHeight - el.scrollTop - el.clientHeight < 30
                ) {
                  setUnseen(false);
                  markRead();
                }
              }}
            >
              {older && (
                <button className="btn" disabled={loading} onClick={loadOlder}>
                  Раньше в чате
                </button>
              )}
              {loading && !messages.length ? (
                <p>Загружаем переписку…</p>
              ) : !messages.length ? (
                <div className="conversation-empty">
                  <p>
                    Пока тихо. Кинь первый месседж — поздоровайся или собери
                    людей на движ.
                  </p>
                  <div className="chat-starters">
                    {["Привет! Как дела?", "Что задали?", "Собираемся после пар?"].map((text) => (
                      <button key={text} type="button" onClick={() => setDraft(text)}>
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((item) => (
                  <article
                    className="message"
                    data-own={item.author.id === user.id || undefined}
                    key={item.id}
                  >
                    <b>
                      {item.author.id === user.id ? "Ты" : item.author.fullName}
                    </b>
                    <p>{item.body}</p>
                    <time>
                      {new Date(item.createdAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </article>
                ))
              )}
            </div>
            {unseen && (
              <button
                className="new-messages"
                onClick={() => {
                  view.current.scrollTop = view.current.scrollHeight;
                  setUnseen(false);
                  markRead();
                }}
              >
                К новым сообщениям ↓
              </button>
            )}
            {(failure || loadFailure) && (
              <div className="chat-error" role="alert">
                <p>{failure || loadFailure}</p>
                {loadFailure && (
                  <button className="btn" onClick={() => refresh.current?.()}>
                    Обновить диалог
                  </button>
                )}
              </div>
            )}
            <form className="message-compose" onSubmit={send}>
              <PaperBurst trigger={burst} />
              <label className="sr-only" htmlFor="chat-message">
                Сообщение
              </label>
              <textarea
                id="chat-message"
                rows={2}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  selected?.kind === "group"
                    ? "Что у вас в группе?"
                    : "Напиши в личку…"
                }
                disabled={busy}
              />
              <button
                className="btn btn-primary"
                disabled={busy || !draft.trim()}
              >
                {busy ? "Отправляем…" : "Отправить"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

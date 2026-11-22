import { useApi } from "../useApi";
import { Link } from "../navigation";
import { Avatar } from "./Avatar";
export function ChatPreview() {
  const { data, error, reload } = useApi("/social/threads");
  return (
    <section className="chat-preview">
      <header>
        <h2>На связи</h2>
        <Link to="/social">В социалку →</Link>
      </header>
      {error ? (
        <button className="btn" onClick={reload}>
          Загрузить чаты
        </button>
      ) : !data ? (
        <p role="status">Загружаем диалоги…</p>
      ) : (
        data.threads.slice(0, 4).map((thread) => (
          <Link
            className="chat-preview-row"
            key={thread.id}
            to={"/social?thread=" + encodeURIComponent(thread.id)}
          >
            {thread.peer ? (
              <Avatar user={thread.peer} size="sm" />
            ) : (
              <span className="group-sign" aria-hidden="true">
                #
              </span>
            )}
            <div>
              <b>{thread.kind === "group" ? "Твоя группа" : thread.title}</b>
              <small>{thread.preview}</small>
            </div>
            {thread.unread > 0 && (
              <span
                className="chat-unread"
                aria-label={`Непрочитанных: ${thread.unread}`}
              >
                {thread.unread}
              </span>
            )}
          </Link>
        ))
      )}
    </section>
  );
}

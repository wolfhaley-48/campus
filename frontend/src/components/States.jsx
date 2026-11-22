import { RefreshCw, TriangleAlert } from "../icons";
import { Spinner } from "./Motion";

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty-icon">
          <Icon strokeWidth={1.8} aria-hidden="true" />
        </span>
      )}
      <p className="empty-title">{title}</p>
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ text = "Проверь подключение и попробуй ещё раз.", onRetry }) {
  return (
    <div className="error-state" role="alert">
      <span className="empty-icon">
        <TriangleAlert strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h2>Не удалось загрузить данные</h2>
      <p>{text}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" />
          Повторить
        </button>
      )}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Загрузка">
      <div className="page-head"><div className="stack" style={{ gap: 10 }}>
        <div className="skeleton" style={{ width: 120, height: 10 }} />
        <div className="skeleton" style={{ width: 280, height: 34 }} />
        <div className="skeleton" style={{ width: 340, height: 12 }} />
      </div><div className="skeleton" style={{ width: 148, height: 40, borderRadius: 999 }} /></div>
      <div className="skeleton dashboard-next-placeholder" />
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <div className="skeleton" style={{ width: 150, height: 24 }} />
          <div className="stack">{[0, 1, 2].map((item) => <div className="skeleton" key={item} style={{ height: 96 }} />)}</div>
          <div className="skeleton" style={{ height: 180 }} />
        </div>
        <div className="dashboard-side">
          <div className="skeleton" style={{ height: 100 }} />
          <div className="skeleton" style={{ height: 220 }} />
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      </div>
    </div>
  );
}

export function FullscreenLoader() {
  return (
    <div className="fullscreen-loader" role="status" aria-label="Загрузка кабинета">
      <span className="loader-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path
            d="M20 47V17h9v11.4L41.4 17H52L37.4 32.2 52.8 47H41.3L29 35.1V47z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="loader-text">Открываем кабинет</span>
      <Spinner size={14} />
    </div>
  );
}

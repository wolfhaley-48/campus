import { useParams } from "react-router-dom";
import { Link } from "../navigation";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  FileCheck2,
  FileText,
  Plus,
  ShieldCheck,
  X,
} from "../icons";

import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState } from "../components/States";
import { LoadTransition } from "../components/Motion";
import { useApi } from "../useApi";
import { formatDateTime, plural, requestStatusTone } from "../utils";

const STEPS = [
  { key: "submitted", label: "Подана", hint: "Деканат получил заявку" },
  { key: "in_progress", label: "В работе", hint: "Документ готовят" },
  { key: "ready", label: "Готова", hint: "Можно получить" },
];

const DELIVERY = {
  electronic: "Электронно, PDF в кабинете",
  paper: "Бумажный оригинал в деканате",
};

function DetailSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Загрузка заявки">
      <div className="skeleton" style={{ width: 120, height: 12 }} />
      <div className="skeleton" style={{ width: 320, height: 36 }} />
      <div className="skeleton" style={{ height: 84, borderRadius: 20 }} />
      <div className="detail-grid">
        <div className="skeleton" style={{ height: 340, borderRadius: 24 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 24 }} />
      </div>
    </div>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/requests/${id}`);

  if (loading && !data) return <LoadTransition phase="loading"><DetailSkeleton /></LoadTransition>;

  if (error && error.status === 404) {
    return (
      <LoadTransition phase="missing"><div className="page">
        <PageHeader eyebrow="Сервисы" title="Заявка" />
        <div className="card">
          <EmptyState
            icon={FileText}
            title="Заявка не найдена"
            text="Возможно, ссылка устарела или заявка принадлежит другому студенту."
            action={
              <Link to="/requests" className="btn btn-soft btn-sm">
                <ArrowLeft size={14} aria-hidden="true" /> Все заявки
              </Link>
            }
          />
        </div>
      </div></LoadTransition>
    );
  }

  if (error) {
    return (
      <LoadTransition phase="error"><div className="page">
        <PageHeader eyebrow="Сервисы" title="Заявка" />
        <ErrorState onRetry={reload} />
      </div></LoadTransition>
    );
  }

  const request = data.request;
  const rejected = request.status === "rejected";
  const step = rejected ? -1 : request.statusStep;

  return (
    <LoadTransition phase="ready"><div className="page request-detail-page">
      <Link to="/requests" className="back-link">
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        Все заявки
      </Link>

      <PageHeader
        eyebrow={request.number}
        title={request.typeLabel}
        subtitle={`Подана ${formatDateTime(request.createdAt)}`}
        actions={
          <>
            <span className={`pill pill-${requestStatusTone(request.status)} pill-status detail-status`}>
              {request.statusLabel}
            </span>
            <Link to="/requests?new=1" className="btn btn-ghost btn-sm">
              <Plus size={14} aria-hidden="true" /> Ещё заявка
            </Link>
          </>
        }
      />

      {rejected ? (
        <div className="status-banner status-banner-danger">
          <X size={18} strokeWidth={2.2} aria-hidden="true" />
          <div>
            <b>Заявка отклонена</b>
            <span>{request.resultNote || "Причина указана в комментарии деканата."}</span>
          </div>
        </div>
      ) : (
        <div className="status-stepper" aria-label="Статус заявки">
          {STEPS.map((item, index) => {
            const done = index <= step;
            const current = index === step;
            return (
              <div
                key={item.key}
                className="status-step"
                data-done={done ? "true" : undefined}
                data-current={current ? "true" : undefined}
              >
                <span className="status-dot">
                  {index < step ? (
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="status-text">
                  <b>{item.label}</b>
                  <small>{item.hint}</small>
                </span>
                {index < STEPS.length - 1 && <span className="status-line" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}

      {request.status === "ready" && (
        <div className="result-banner">
          <span className="result-icon">
            <FileCheck2 size={20} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div>
            <b>Документ готов</b>
            <span>{request.resultNote || "Заберите оригинал в деканате, ауд. 115."}</span>
          </div>
          <span className="pill pill-success">Готово</span>
        </div>
      )}

      <div className="detail-grid">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">История заявки</h2>
            <span className="pill pill-neutral">{request.timeline.length} {plural(request.timeline.length, "событие", "события", "событий")}</span>
          </div>

          <ol className="timeline">
            {request.timeline.map((event, index) => {
              const last = index === request.timeline.length - 1;
              return (
                <li key={`${event.status}-${event.at}`} className="timeline-item" data-last={last ? "true" : undefined}>
                  <span className="timeline-marker" data-last={last ? "true" : undefined}>
                    {last ? (
                      <CircleCheck size={14} strokeWidth={2.4} aria-hidden="true" />
                    ) : (
                      <span className="timeline-dot" />
                    )}
                  </span>
                  <div className="timeline-body">
                    <b>{event.label}</b>
                    <span>{formatDateTime(event.at)}</span>
                    {event.note && <p>{event.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>

          {request.comment && (
            <div className="request-comment">
              <span className="field-label">Комментарий студента</span>
              <p>{request.comment}</p>
            </div>
          )}
        </section>

        <aside className="detail-aside">
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Детали</h2>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Номер</dt>
                <dd>{request.number}</dd>
              </div>
              <div>
                <dt>Получение</dt>
                <dd>{DELIVERY[request.delivery] || request.delivery}</dd>
              </div>
              <div>
                <dt>Создана</dt>
                <dd>{formatDateTime(request.createdAt)}</dd>
              </div>
              <div>
                <dt>Обновлена</dt>
                <dd>{formatDateTime(request.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <div className="security-note">
            <ShieldCheck size={17} strokeWidth={1.9} aria-hidden="true" />
            <p>Заявка доступна только в вашем аккаунте.</p>
          </div>
        </aside>
      </div>
    </div></LoadTransition>
  );
}

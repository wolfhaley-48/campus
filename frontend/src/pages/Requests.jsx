import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  FileSearch,
  FileText,
  Plus,
} from "../icons";
import { useSearchParams } from "react-router-dom";
import { Link, useAppNavigate } from "../navigation";

import { NewRequestModal } from "../components/NewRequestModal";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState } from "../components/States";
import { ChoiceGroup, ContentSwap, Disclosure, LoadTransition } from "../components/Motion";
import { useApi } from "../useApi";
import { formatDateTime, requestStatusTone } from "../utils";

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "active", label: "В работе" },
  { key: "ready", label: "Готовые" },
];

function RequestsSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Загрузка заявок">
      <div className="stack" style={{ gap: 10 }}>
        <div className="skeleton" style={{ width: 90, height: 10 }} />
        <div className="skeleton" style={{ width: 220, height: 34 }} />
      </div>
      <div className="skeleton" style={{ height: 46, borderRadius: 999, width: 360 }} />
      {[0, 1, 2].map((item) => (
        <div key={item} className="skeleton" style={{ height: 120, borderRadius: 20 }} />
      ))}
    </div>
  );
}

export default function Requests() {
  const { data, loading, error, reload } = useApi("/requests");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useAppNavigate();
  const createdRequest = useRef(null);

  useEffect(() => {
    setModalOpen(searchParams.get("new") === "1");
  }, [searchParams]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    if (searchParams.get("new")) {
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (loading && !data) return <LoadTransition phase="loading"><RequestsSkeleton /></LoadTransition>;

  if (error) {
    return (
      <LoadTransition phase="error"><div className="page">
        <PageHeader eyebrow="Сервисы" title="Заявки и справки" />
        <ErrorState onRetry={reload} />
      </div></LoadTransition>
    );
  }

  const requests = data.requests;
  const counts = {
    all: requests.length,
    active: requests.filter((item) => ["submitted", "in_progress"].includes(item.status))
      .length,
    ready: requests.filter((item) => item.status === "ready").length,
  };
  const filtered = requests.filter((request) => {
    if (filter === "active") return ["submitted", "in_progress"].includes(request.status);
    if (filter === "ready") return request.status === "ready";
    return true;
  });
  const deliveryLabels = Object.fromEntries(
    (data.delivery || []).map((item) => [item.key, item.label]),
  );

  return (
    <LoadTransition phase="ready"><div className="page requests-page">
      <PageHeader
        title="Заявки и справки"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
            Новая заявка
          </button>
        }
      />

      <div className="requests-toolbar">
        <ChoiceGroup label="Фильтр заявок" className="filter-bar" buttonClassName="filter-chip" value={filter} onChange={setFilter} options={FILTERS.map((item) => ({ ...item, count: counts[item.key] }))} />
      </div>

      <ContentSwap value={filter}><div className="request-results">
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={filter === "ready" ? FileSearch : FileText}
            title={
              filter === "all"
                ? "Заявок пока нет"
                : filter === "ready"
                  ? "Готовых заявок нет"
                  : "Нет заявок в работе"
            }
            text="Справка об обучении готовится 1–2 рабочих дня. Заявление на стипендию — до пяти."
            action={
              filter === "all" ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus size={14} aria-hidden="true" /> Создать заявку
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="request-list">
          {filtered.map((request) => (
            <Link
              to={`/requests/${request.id}`}
              className="request-card"
              data-status={request.status}
              key={request.id}
            >
              <span className="request-main">
                <span className="request-topline">
                  <span className="request-number">{request.number}</span>
                  <span className={`pill pill-${requestStatusTone(request.status)} pill-status`}>
                    {request.statusLabel}
                  </span>
                </span>
                <span className="request-title">{request.typeLabel}</span>
                <span className="request-meta">
                  {formatDateTime(request.createdAt)} · {deliveryLabels[request.delivery] || request.delivery}
                </span>
              </span>
              <ChevronRight
                size={18}
                strokeWidth={1.9}
                className="request-chevron"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      )}
      </div></ContentSwap>

      <Disclosure className="request-help" title="Какую справку выбрать">
          <p>
            Справка об обучении подтверждает курс и форму обучения. Для военкомата нужна
            отдельная форма с печатью. Справка о стипендии показывает выплаты за три месяца.
          </p>
      </Disclosure>

      {data && (
        <NewRequestModal initialType={searchParams.get("type")}
          open={modalOpen}
          onClose={closeModal}
          types={data.types}
          delivery={data.delivery}
          onCreated={(request) => {
            createdRequest.current = request;
            closeModal();
          }}
          onExitComplete={() => {
            if (!createdRequest.current) return;
            const request = createdRequest.current;
            createdRequest.current = null;
            navigate(`/requests/${request.id}`);
          }}
        />
      )}
    </div></LoadTransition>
  );
}

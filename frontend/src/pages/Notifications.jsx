import { ReactiveButton } from "../components/ReactiveSurface";
import { Link } from "../navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellOff, CheckCheck, Inbox } from "../icons";

import { api } from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState } from "../components/States";
import { AnimatedCount, ChoiceGroup, ContentSwap, LoadTransition, Spinner } from "../components/Motion";
import { useToast } from "../toast";
import { useApi } from "../useApi";
import {
  categoryLabel,
  daysUntil,
  daysWord,
  formatDayMonth,
  timeAgo,
  todayIso,
} from "../utils";

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "dean", label: "Деканат" },
  { key: "schedule", label: "Расписание" },
  { key: "deadline", label: "Дедлайны" },
  { key: "request", label: "Заявки" },
];

function dayKey(iso) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function groupLabel(key, today) {
  if (key === today) return "Сегодня";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (key === yesterdayKey) return "Вчера";
  return formatDayMonth(key);
}

function NotificationSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Загрузка уведомлений">
      <div className="page-head"><div className="skeleton" style={{ width: 260, height: 38 }} /><div className="skeleton" style={{ width: 140, height: 36, borderRadius: 999 }} /></div>
      <div className="inbox-layout">
        <div className="inbox-skeleton-filters">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="skeleton" style={{ height: 40 }} />)}</div>
        <div className="stack"><div className="skeleton" style={{ width: 90, height: 18 }} />{[0, 1, 2].map((item) => <div key={item} className="skeleton" style={{ height: 130 }} />)}</div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { data, loading, error, reload } = useApi("/notifications");
  const { refreshUnread } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (data) setItems(data.notifications);
  }, [data]);

  const unread = items.filter((item) => !item.isRead).length;
  const counts = FILTERS.reduce((acc, item) => {
    acc[item.key] =
      item.key === "all"
        ? items.length
        : items.filter((notification) => notification.category === item.key).length;
    return acc;
  }, {});

  const filtered = items.filter(
    (item) => filter === "all" || item.category === filter,
  );

  const groups = useMemo(() => {
    const today = todayIso();
    const map = new Map();
    for (const item of filtered) {
      const key = dayKey(item.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()].map(([key, list]) => ({
      key,
      label: groupLabel(key, today),
      items: list,
    }));
  }, [filtered]);

  if (loading && !data) return <LoadTransition phase="loading"><NotificationSkeleton /></LoadTransition>;

  if (error) {
    return (
      <LoadTransition phase="error"><div className="page">
        <PageHeader eyebrow="Сервисы" title="Уведомления" />
        <ErrorState onRetry={reload} />
      </div></LoadTransition>
    );
  }

  const markRead = async (notification) => {
    if (notification.isRead) return;
    setItems((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item,
      ),
    );
    try {
      await api.post(`/notifications/${notification.id}/read`);
      refreshUnread();
    } catch (error) {
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: false } : item,
        ),
      );
      toast({ kind: "error", title: "Не удалось отметить уведомление", body: error.message });
    }
  };

  const markAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await api.post("/notifications/read-all");
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      refreshUnread();
      toast({ kind: "success", title: "Все уведомления прочитаны" });
    } catch (requestError) {
      toast({
        kind: "error",
        title: "Не удалось обновить",
        body: requestError.message,
      });
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <LoadTransition phase="ready"><div className="page notifications-page">
      <PageHeader
        title="Уведомления"
        actions={
          <>
              <span className={`pill ${unread ? "pill-accent" : "pill-neutral"}`}>
                Непрочитано: <AnimatedCount value={unread} />
              </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={markAll}
              disabled={unread === 0 || markingAll}
              aria-busy={markingAll}
            >
              {markingAll ? <Spinner size={15} /> : <CheckCheck size={15} strokeWidth={1.9} aria-hidden="true" />}
              Прочитать все
            </button>
          </>
        }
      />

      <div className="inbox-layout">
      <ChoiceGroup label="Категории уведомлений" className="filter-bar" buttonClassName="filter-chip" value={filter} onChange={setFilter} options={FILTERS.map((item) => ({ ...item, count: counts[item.key] }))} />

      <ContentSwap value={filter}>
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={filter === "all" ? Inbox : BellOff}
            title="Здесь пока пусто"
            text={
              filter === "all"
                ? "Новости деканата и напоминания появятся здесь."
                : "В этой категории уведомлений нет."
            }
          />
        </div>
      ) : (
        <div className="notification-groups">
          {groups.map((group) => (
            <section key={group.key} className="notification-group">
              <h2 className="notification-group-title">{group.label}</h2>
              <div className="notification-list">
                {group.items.map((item) => {
                  const due = item.dueDate ? daysUntil(item.dueDate) : null;
                  return (
                    <article key={item.id} className="notification-entry">
                    <ReactiveButton
                      type="button"
                      className="notification-card"
                      data-category={item.category}
                      data-overdue={due !== null && due < 0 || undefined}
                      data-unread={!item.isRead ? "true" : undefined}
                      onClick={() => markRead(item)}
                    >
                      <span className="notification-main">
                        <span className="notification-topline">
                          <span className="notification-category">
                            {categoryLabel(item.category)}
                          </span>
                          <span className="notification-time">{timeAgo(item.createdAt)}</span>
                          <span className="unread-indicator"><AnimatePresence initial={false}>{!item.isRead && <motion.span className="unread-dot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} />}</AnimatePresence></span>
                          {!item.isRead && <span className="sr-only">Не прочитано</span>}
                        </span>
                        <span className="notification-title">{item.title}</span>
                        <span className="notification-body">{item.body}</span>
                        {item.dueDate && (
                          <span className="notification-due">
                            {due < 0 ? "Срок истёк " : "до "}{formatDayMonth(item.dueDate)}
                            {due !== null && due >= 0 && (
                              <em>
                                {due === 0
                                  ? " · сегодня"
                                  : ` · ${due} ${daysWord(due)}`}
                              </em>
                            )}
                          </span>
                        )}
                      </span>
                    </ReactiveButton>
                    {item.action && <Link className="notification-action" to={item.action.href}>{item.action.label}</Link>}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      </ContentSwap>

      </div>
      <p className="notifications-note">Нажмите на уведомление, чтобы отметить прочитанным.</p>
    </div></LoadTransition>
  );
}

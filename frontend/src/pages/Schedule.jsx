import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "../icons";

import { ChangeNote } from "../components/ChangeNote";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState } from "../components/States";
import { ChoiceGroup, ContentSwap, LoadTransition, Spinner } from "../components/Motion";
import { CONTENT_TRANSITION } from "../motion";
import { useApi } from "../useApi";
import {
  WEEKDAYS,
  WEEKDAYS_SHORT,
  formatDateRange,
  formatDayMonth,
  lessonTypeTone,
  plural,
} from "../utils";

function ScheduleSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Загрузка расписания">
      <div className="page-head">
        <div className="skeleton" style={{ width: 240, height: 38 }} />
        <div className="skeleton" style={{ width: 320, height: 38 }} />
      </div>
      <div className="agenda-toolbar"><div className="skeleton" style={{ width: 180, height: 20 }} /><div className="skeleton" style={{ width: 180, height: 42, borderRadius: 999 }} /></div>
      <div className="panel-day-picker">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => <div key={day} className="skeleton" style={{ height: 66 }} />)}
      </div>
      <div className="skeleton" style={{ width: 160, height: 36 }} />
      <div className="stack">{[0, 1, 2].map((item) => <div key={item} className="skeleton" style={{ height: 118 }} />)}</div>
    </div>
  );
}

function LessonCard({ lesson, wide = false }) {
  const cancelled = lesson.change?.kind === "cancelled";
  return (
    <article
      className={`sched-lesson${wide ? " sched-lesson-wide" : ""}${cancelled ? " is-cancelled" : ""}`}
    >
      <div className="sched-lesson-top">
        <span className="sched-time">
          {lesson.start}
          <span>{lesson.end}</span>
        </span>
        {!wide && <span className={`type-pill type-${lessonTypeTone(lesson.type)}`}>{lesson.type}</span>}
      </div>
      <h3 className="sched-subject">{lesson.subject}</h3>
      <p className="sched-place">
        <MapPin size={12} strokeWidth={2} aria-hidden="true" />
        ауд. {lesson.room}, {lesson.building}
      </p>
      <p className="sched-teacher">{lesson.teacher}</p>
      {wide && <span className={`lesson-kind type-pill type-${lessonTypeTone(lesson.type)}`}>{lesson.type}</span>}
      <ChangeNote change={lesson.change} compact={!wide} />
    </article>
  );
}

function DayColumn({ day }) {
  return (
    <section className={`week-day${day.isToday ? " is-today" : ""}`}>
      <header className="week-day-head">
        <span className="week-day-name">{WEEKDAYS[day.weekday - 1]}</span>
        <span className="week-day-date">{Number(day.date.slice(8, 10))}</span>
        {day.isToday && <span className="week-today-mark">сегодня</span>}
      </header>
      <div className="week-day-body">
        {day.lessons.length === 0 ? (
          <p className="week-day-empty">Занятий нет</p>
        ) : (
          day.lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)
        )}
      </div>
    </section>
  );
}

export default function Schedule() {
  const [offset, setOffset] = useState(0);
  const [weekday, setWeekday] = useState(null);
  const [direction, setDirection] = useState(0);
  const [view, setView] = useState("day");
  const { data, loading, error, reload } = useApi(`/schedule?week=${offset}`);
  const reduced = useReducedMotion();

  if (loading && !data) return <LoadTransition phase="loading"><ScheduleSkeleton /></LoadTransition>;

  if (error) {
    return (
      <LoadTransition phase="error"><div className="page">
        <PageHeader eyebrow="Учёба" title="Расписание" />
        <ErrorState onRetry={reload} />
      </div></LoadTransition>
    );
  }

  const lessonCount = data.days.reduce((sum, day) => sum + day.lessons.length, 0);
  const changeCount = data.days.reduce(
    (sum, day) => sum + day.lessons.filter((lesson) => lesson.change).length,
    0,
  );
  const activeDay = data.days.find((day) => day.weekday === weekday) || data.days.find((day) => day.isToday) || data.days[0];
  const changeWeek = (next) => {
    setDirection(Math.sign(next - offset));
    setWeekday(activeDay.weekday);
    setOffset(Math.max(-8, Math.min(8, next)));
  };

  return (
    <LoadTransition phase="ready"><div className="page">
      <PageHeader
        title="Расписание"
        actions={
          <div className="week-nav">
            <button
              type="button"
              className="icon-btn"
              onClick={() => changeWeek(offset - 1)}
              disabled={offset <= -8}
              aria-label="Предыдущая неделя"
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="week-nav-label">
              {formatDateRange(data.weekStart, data.weekEnd)}
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => changeWeek(offset + 1)}
              disabled={offset >= 8}
              aria-label="Следующая неделя"
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
              <button type="button" className="btn btn-soft btn-sm" disabled={offset === 0} onClick={() => changeWeek(0)}>
                Эта неделя
              </button>
            <span className="week-refresh" role="status" aria-label={loading ? "Обновление расписания" : undefined}>{loading && <Spinner size={14} />}</span>
          </div>
        }
      />

      <div className="agenda-toolbar"><div className="schedule-summary">
        <span>
          <CalendarDays size={15} strokeWidth={1.9} aria-hidden="true" />
          {lessonCount} {plural(lessonCount, "занятие", "занятия", "занятий")}
        </span>
        {changeCount > 0 ? (
          <span className="schedule-changes">
            {changeCount} {plural(changeCount, "изменение", "изменения", "изменений")}
          </span>
        ) : (
          <span className="muted">Без изменений</span>
        )}
        <span className="muted schedule-summary-date">
          Сегодня, {formatDayMonth(data.today)}
        </span>
      </div>

      <div className="schedule-view-controls">
        <ChoiceGroup label="Вид расписания" value={view} onChange={(next) => { setDirection(0); setView(next); }} options={[{ key: "day", label: "По дням" }, { key: "week", label: "Вся неделя" }]} />
      </div>
      </div>

      <div className="schedule-content" aria-busy={loading}>
      <motion.div className="day-selector-slot" initial={false} animate={{ height: view === "day" ? "auto" : 0, opacity: view === "day" ? 1 : 0 }} transition={reduced ? { duration: 0 } : CONTENT_TRANSITION} aria-hidden={view !== "day"} inert={view !== "day" ? true : undefined}>
        <div className="day-selector-body"><ChoiceGroup label="День недели" className="mobile-day-picker panel-day-picker" buttonClassName="day-chip" value={activeDay.weekday}
          onChange={(next) => { setDirection(Math.sign(next - activeDay.weekday)); setWeekday(next); }}
          options={data.days.map((day) => ({ key: day.weekday, label: WEEKDAYS_SHORT[day.weekday - 1], date: day.date, today: day.isToday, changed: day.lessons.some((lesson) => lesson.change), ariaLabel: `${WEEKDAYS[day.weekday - 1]}, ${formatDayMonth(day.date)}${day.isToday ? ", сегодня" : ""}` }))}
          renderOption={(day) => <><span>{day.label}</span><b>{Number(day.date.slice(8, 10))}</b>{day.changed && <i className="day-chip-dot" />}</>}
        /></div>
      </motion.div>

      <ContentSwap value={`${view}-${data.weekStart}-${view === "day" ? activeDay.date : ""}`} direction={direction}>
      {view === "week" && <div className="week-board panel-week-board" role="region" aria-label="Расписание на неделю" tabIndex={0}>
        {data.days.map((day) => (
          <DayColumn key={day.date} day={day} />
        ))}
      </div>}

      {view === "day" && <div className="day-focus panel-day-focus">
        <div className="day-focus-head">
          <div>
            <p className="eyebrow">{WEEKDAYS[activeDay.weekday - 1]}</p>
            <h2 className="day-focus-title">{formatDayMonth(activeDay.date)}</h2>
          </div>
          {activeDay.isToday && <span className="pill pill-accent">Сегодня</span>}
        </div>

        {activeDay.lessons.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={CalendarOff}
              title="Занятий нет"
            />
          </div>
        ) : (
          <div className="day-focus-list">
            {activeDay.lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} wide />
            ))}
          </div>
        )}
      </div>}
      </ContentSwap>
      </div>
    </div></LoadTransition>
  );
}

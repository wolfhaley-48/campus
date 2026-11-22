import { Link } from "../navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { CalendarClock, Check, GraduationCap, Info } from "../icons";

import { useAuth } from "../auth";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState } from "../components/States";
import { ChoiceGroup, ContentSwap, LoadTransition } from "../components/Motion";
import { useApi } from "../useApi";
import {
  formatDayShort,
  gradeTone,
  plural,
  daysWord,
  daysUntil,
} from "../utils";

function GradesSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Загрузка оценок">
      <div className="stack" style={{ gap: 10 }}>
        <div className="skeleton" style={{ width: 120, height: 10 }} />
        <div className="skeleton" style={{ width: 300, height: 34 }} />
      </div>
      <div className="stats-grid">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="skeleton" style={{ height: 104, borderRadius: 20 }} />
        ))}
      </div>
      <div className="grades-grid">
        <div className="skeleton" style={{ height: 460, borderRadius: 24 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 24 }} />
      </div>
    </div>
  );
}

function GradeValue({ subject }) {
  if (typeof subject.grade === "number") {
    return (
      <span className="grade-chip" data-tone={gradeTone(subject.grade)}>
        {subject.grade}
      </span>
    );
  }
  if (subject.grade === "Зачтено") {
    return (
      <span className="grade-chip grade-chip-word" data-tone="excellent">
        <Check size={12} strokeWidth={2.6} aria-hidden="true" />
        Зачтено
      </span>
    );
  }
  if (subject.examDate) {
    return (
      <span className="grade-date">
        <CalendarClock size={13} strokeWidth={1.9} aria-hidden="true" />
        {formatDayShort(subject.examDate)}
      </span>
    );
  }
  return <span className="grade-pending">—</span>;
}

function SubjectRow({ subject }) {
  return (
    <div className="grade-row" data-status={subject.status}>
      <div className="grade-subject">
        <span className="grade-subject-name">{subject.subject}</span>
        <span className="grade-subject-meta">
          {subject.control} · {subject.teacher}
        </span>
      </div>
      <span className="grade-credits">{subject.credits} з.е.</span>
      <div className="grade-result">
        <GradeValue subject={subject} />
      </div>
    </div>
  );
}

function plannedExams(subjects) {
  return subjects
    .filter((subject) => subject.grade === null || subject.grade === undefined)
    .filter((subject) => subject.examDate)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
}

export default function Grades() {
  const { data, loading, error, reload } = useApi("/grades");
  const reduced = useReducedMotion();
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);

  if (loading && !data) return <LoadTransition phase="loading"><GradesSkeleton /></LoadTransition>;

  if (error) {
    return (
      <LoadTransition phase="error"><div className="page">
        <PageHeader eyebrow="Учёба" title="Успеваемость" />
        <ErrorState onRetry={reload} />
      </div></LoadTransition>
    );
  }

  if (!data.summary || !data.semesters.length) {
    return <LoadTransition phase="empty"><div className="page">
      <PageHeader title="Успеваемость" />
      <EmptyState icon={GraduationCap} title="Оценок пока нет" text="Они появятся после загрузки ведомостей деканатом." />
    </div></LoadTransition>;
  }

  const summary = data.summary;
  const semesterNumber = activeSemester ?? summary?.currentSemester;
  const semester =
    data.semesters.find((item) => item.number === semesterNumber) || data.semesters[0];
  const exams = plannedExams(semester.subjects);

  return (
    <LoadTransition phase="ready"><div className="page grades-page" data-risk={summary.debts > 0 || undefined}>
      <PageHeader title="Успеваемость" />
      {summary.debts > 0 && <section className="grade-recovery"><b>Есть хвосты. Закроем по одному.</b><span>Всего несданных дисциплин: {summary.debts}</span><Link className="btn btn-primary" to="/requests?new=1&type=application_retake">Записаться на пересдачу</Link></section>}
      <div className="grades-toolbar">
        <ChoiceGroup label="Семестр" value={semester.number} onChange={setActiveSemester} options={data.semesters.map((item) => ({ key: item.number, label: `${item.number} семестр`, marker: item.number === summary.currentSemester }))} />

      </div>

      <section className="semester-focus" aria-label="Прогресс обучения"><aside className="average-sticker" aria-label="Средний балл за всё обучение"><b>{summary.overallAverage ?? "—"}</b><span>Средний балл<br/>за всё обучение</span></aside><div className="semester-progress"><span>{semester.number} семестр</span><b>{semester.creditsEarned} из {semester.credits} з.е. закрыто</b><progress value={semester.creditsEarned} max={semester.credits || 1} aria-label="Закрытые зачётные единицы" /></div></section>
      <ContentSwap value={semester.number}><div className="grades-grid">
        <section className="card grade-card">
          <div className="grade-table-head" aria-hidden="true">
            <span>Дисциплина</span>
            <span>З.Е.</span>
            <span>Результат</span>
          </div>

          <div className="grade-list">
            {semester.subjects.map((subject) => (
              <motion.div layout key={subject.id} transition={reduced ? {duration:0} : {type:"spring", stiffness:360, damping:34}} className="subject-expand" data-expanded={expandedSubject === subject.id || undefined}>
                <button className="subject-trigger" type="button" aria-expanded={expandedSubject === subject.id} onClick={()=>setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}><SubjectRow subject={subject}/></button>
                {expandedSubject === subject.id && <motion.div className="subject-detail" initial={reduced ? false : {opacity:0,y:-8}} animate={{opacity:1,y:0}}><p>{subject.comment || (subject.status === "passed" ? "Дисциплина закрыта. Результат уже в ведомости." : "Результат ещё не выставлен. Подготовку можно добавить в личный план.")}</p><Link to={`/plan?task=${encodeURIComponent(`Подготовка: ${subject.subject}`)}&duration=60`}>Найти время на подготовку</Link>{subject.status === "retake" && <Link to="/requests?new=1&type=application_retake">Подать заявление на пересдачу</Link>}</motion.div>}
              </motion.div>
            ))}
          </div>

          <p className="card-footnote grade-footnote">
            <Info size={13} strokeWidth={1.9} aria-hidden="true" />
            «—» значит, что оценка ещё не выставлена. Дата рядом — день экзамена или защиты.
          </p>
        </section>

        <aside className="grades-aside">
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Сессия</h2>
              <span className="pill pill-neutral">
                {exams.length ? `${exams.length} впереди` : "Нет назначенных"}
              </span>
            </div>

            {exams.length === 0 ? (
              <p className="muted small">
                Экзаменов с назначенной датой нет.
              </p>
            ) : (
              <ul className="exam-list">
                {exams.map((subject) => (
                  <li key={subject.id} className="exam-item">
                    <span className="exam-date">{formatDayShort(subject.examDate)}</span>
                    <span className="exam-subject">
                      <b>{subject.subject}</b>
                      <small>{subject.control}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}

          </section>

        </aside>
      </div></ContentSwap>
    </div></LoadTransition>
  );
}

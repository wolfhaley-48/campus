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

function Distribution({ subjects }) {
  const counts = [5, 4, 3].map((mark) => ({
    mark,
    count: subjects.filter((subject) => subject.grade === mark).length,
  }));
  const max = Math.max(1, ...counts.map((item) => item.count));
  const graded = counts.reduce((sum, item) => sum + item.count, 0);

  if (graded === 0) {
    return <p className="muted small">В этом семестре пока нет числовых оценок.</p>;
  }

  return (
    <div className="distribution">
      {counts.map((item) => (
        <div className="distribution-row" key={item.mark}>
          <span className={`grade-chip small-chip`} data-tone={gradeTone(item.mark)}>
            {item.mark}
          </span>
          <span className="distribution-bar">
            <span
              data-tone={gradeTone(item.mark)}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </span>
          <span className="distribution-count">{item.count}</span>
        </div>
      ))}
      <p className="distribution-note">
        {graded} {plural(graded, "оценка", "оценки", "оценок")} с числовым баллом
      </p>
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
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi("/grades");
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
  const currentSemester =
    data.semesters.find((item) => item.number === summary.currentSemester) || semester;
  const exams = plannedExams(semester.subjects);
  const currentExams = plannedExams(currentSemester.subjects);
  const isCurrentSemester = semester.number === summary.currentSemester;
  const sessionDays = daysUntil("2026-12-15");

  return (
    <LoadTransition phase="ready"><div className="page">
      <PageHeader
        title="Успеваемость"
        actions={
          sessionDays !== null && sessionDays >= 0 ? (
            <span className="pill pill-lime">
              До сессии {sessionDays} {daysWord(sessionDays)}
            </span>
          ) : null
        }
      />

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Средний балл</span>
          <div className="stat-value-row">
            <span className="stat-value">{summary.overallAverage ?? "—"}</span>
          </div>
          <span className="stat-note">по всем семестрам</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">В текущем семестре</span>
          <div className="stat-value-row">
            <span className="stat-value">{summary.creditsEarned}</span>
            <span className="stat-suffix">из {summary.creditsTotal} з.е.</span>
          </div>
          <div className="stat-bar" aria-hidden="true">
            <span
              style={{
                width: `${summary.creditsTotal ? (summary.creditsEarned / summary.creditsTotal) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="stat-card" data-tone={summary.debts === 0 ? "success" : "warn"}>
          <span className="stat-label">Задолженности</span>
          <div className="stat-value-row">
            <span className="stat-value">{summary.debts}</span>
          </div>
          <span className="stat-note">
            {summary.debts === 0 ? "Нет пересдач" : "Есть пересдачи"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Экзамены впереди</span>
          <div className="stat-value-row">
            <span className="stat-value">{currentExams.length}</span>
          </div>
          <span className="stat-note">по текущему семестру</span>
        </div>
      </div>

      <div className="grades-toolbar">
        <ChoiceGroup label="Семестр" value={semester.number} onChange={setActiveSemester} options={data.semesters.map((item) => ({ key: item.number, label: `${item.number} семестр`, marker: item.number === summary.currentSemester }))} />
        <span className="pill pill-neutral">
          {semester.creditsEarned} / {semester.credits} з.е.
        </span>
      </div>

      <ContentSwap value={semester.number}><div className="grades-grid">
        <section className="card grade-card">
          <div className="semester-progress">
            <div className="stat-bar" aria-hidden="true">
              <span
                style={{
                  width: `${semester.credits ? (semester.creditsEarned / semester.credits) * 100 : 0}%`,
                }}
              />
            </div>
            <span>
              {semester.creditsEarned} из {semester.credits} зачётных единиц закрыто
            </span>
          </div>

          <div className="grade-table-head" aria-hidden="true">
            <span>Дисциплина</span>
            <span>З.Е.</span>
            <span>Результат</span>
          </div>

          <div className="grade-list">
            {semester.subjects.map((subject) => (
              <SubjectRow key={subject.id} subject={subject} />
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
                {isCurrentSemester ? "15–27 декабря" : "Завершена"}
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

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Итоги семестра</h2>
            </div>

            {semester.average != null && (
              <div className="semester-average">
                <span className="semester-average-value">{semester.average}</span>
                <span className="semester-average-label">
                  средний балл
                  <br />
                  за {semester.number} семестр
                </span>
              </div>
            )}

            <Distribution subjects={semester.subjects} />

            <div className="aside-rows">
              <div className="aside-row">
                <span>Зачётных единиц</span>
                <b>
                  {semester.creditsEarned} / {semester.credits}
                </b>
              </div>
              <div className="aside-row">
                <span>Дисциплин</span>
                <b>{semester.subjects.length}</b>
              </div>
              <div className="aside-row">
                <span>Посещение</span>
                <b>{user.attendance}%</b>
              </div>
            </div>
          </section>
        </aside>
      </div></ContentSwap>
    </div></LoadTransition>
  );
}

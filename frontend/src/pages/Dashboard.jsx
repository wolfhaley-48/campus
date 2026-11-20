import { Link } from "../navigation";
import { ArrowRight, CalendarOff, Check, FileText, Plus } from "../icons";
import { useAuth } from "../auth";
import { ChangeNote } from "../components/ChangeNote";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "../components/States";
import { LoadTransition } from "../components/Motion";
import { useApi } from "../useApi";
import { daysUntil, daysWord, dayLabel, formatDayShort, formatFullDate, plural, requestStatusTone, lessonTypeTone, timeAgo } from "../utils";

function TodayLesson({ lesson }) {
  return <div className="today-lesson" data-status={lesson.status}>
    <div className="today-time"><b>{lesson.start}</b><span>{lesson.end}</span></div>
    <div className="today-body">
      <h3>{lesson.subject}</h3>
      <p>ауд. {lesson.room} · {lesson.building}</p>
      <span className="today-teacher">{lesson.teacher}</span>
      <ChangeNote change={lesson.change} compact />
    </div>
    <span className={`type-pill type-${lessonTypeTone(lesson.type)}`}>{lesson.status === "now" ? "Сейчас" : lesson.type}</span>
  </div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi("/dashboard");
  if (loading) return <LoadTransition phase="loading"><PageSkeleton /></LoadTransition>;
  if (error) return <LoadTransition phase="error"><div className="page"><PageHeader title="Главная" /><ErrorState onRetry={reload} /></div></LoadTransition>;

  const next = data.nextLesson;
  const sessionDays = daysUntil("2026-12-15");
  const nextDay = next && dayLabel(next.date, data.today.date);
  return <LoadTransition phase="ready"><div className="page dashboard-page">
    <PageHeader eyebrow={`${user.group} · ${user.course} курс`} title={`Привет, ${user.firstName}`} subtitle={formatFullDate(data.today.date)} actions={
      <Link to="/requests?new=1" className="btn btn-primary"><Plus size={17} />Новая заявка</Link>
    } />

    {next && <section className="next-class" aria-label="Ближайшее занятие">
      <div className="next-class-time"><span>Следующая пара</span><strong>{next.lesson.start}</strong><span>{nextDay === "Сегодня" || nextDay === "Завтра" ? nextDay : formatDayShort(next.date)}</span></div>
      <div className="next-class-body"><h2>{next.lesson.subject}</h2><p>ауд. {next.lesson.room} · {next.lesson.building} · {next.lesson.type}</p><span>{next.lesson.teacher}</span><ChangeNote change={next.lesson.change} compact /></div>
      <Link to="/schedule" className="next-class-link" aria-label="Открыть расписание"><ArrowRight size={22} /></Link>
    </section>}

    <div className="dashboard-columns">
      <div className="dashboard-main">
        <section className="dashboard-section">
          <div className="section-head"><h2>Сегодня <span>{data.today.lessons.length} {plural(data.today.lessons.length, "пара", "пары", "пар")}</span></h2><Link to="/schedule" className="text-link">Вся неделя <ArrowRight size={15} /></Link></div>
          {data.today.lessons.length ? <div className="today-list">{data.today.lessons.map((lesson) => <TodayLesson key={lesson.id} lesson={lesson} />)}</div> : <EmptyState icon={CalendarOff} title="Сегодня занятий нет" />}
        </section>
        <section className="dashboard-section">
          <div className="section-head"><h2>Учёба</h2><Link to="/grades" className="text-link">Оценки <ArrowRight size={15} /></Link></div>
          <dl className="study-summary">
            <div><dt>Средний балл</dt><dd>{data.stats.average ?? "—"}</dd><small>{data.stats.currentAverage != null ? "за текущий семестр" : "по всем семестрам"}</small></div>
            <div><dt>Закрыто в семестре</dt><dd>{data.stats.creditsEarned ?? "—"}<small> / {data.stats.creditsTotal ?? "—"} з.е.</small></dd><small>зачёты и экзамены</small></div>
            <div><dt>Задолженности</dt><dd data-tone={data.stats.debts ? "warn" : "success"}>{data.stats.debts}</dd><small>{data.stats.debts ? "Есть пересдачи" : "Нет пересдач"}</small></div>
            <div><dt>Посещение</dt><dd>{data.stats.attendance ?? "—"}<small>%</small></dd><small>по данным деканата</small></div>
          </dl>
          {sessionDays >= 0 && <p className="section-note">До сессии {sessionDays} {daysWord(sessionDays)} · начало 15 декабря</p>}
        </section>
      </div>

      <aside className="dashboard-side">
        <section className="dashboard-section">
          <div className="section-head"><h2>Сроки</h2></div>
          {data.deadlines.length ? <ul className="deadline-list">{data.deadlines.map((item) => <li key={item.id} className="deadline-row"><span className="date-stamp">{formatDayShort(item.dueDate)}</span><div><b>{item.title}</b><p>{daysUntil(item.dueDate) === 0 ? "Сегодня" : `${daysUntil(item.dueDate)} ${daysWord(daysUntil(item.dueDate))}`}</p></div></li>)}</ul> : <p className="quiet-message"><Check size={16} />Ближайших сроков нет</p>}
        </section>
        <section className="dashboard-section">
          <div className="section-head"><h2>Мои заявки</h2><Link to="/requests" className="text-link">Все <ArrowRight size={15} /></Link></div>
          {data.requests.length ? <div className="recent-requests">{data.requests.map((item) => <Link to={`/requests/${item.id}`} key={item.id}><div><b>{item.typeLabel}</b><small>{item.number}</small></div><span className={`pill pill-${requestStatusTone(item.status)}`}>{item.statusLabel}</span></Link>)}</div> : <EmptyState icon={FileText} title="Заявок пока нет" />}
        </section>
        <section className="dashboard-section">
          <div className="section-head"><h2>Последние события</h2><Link to="/notifications" className="text-link">Все <ArrowRight size={15} /></Link></div>
          <div className="recent-news">{data.notifications.map((item) => <Link to="/notifications" key={item.id}><b>{item.title}</b><small>{!item.isRead && <i className="unread-dot" />}{timeAgo(item.createdAt)}</small></Link>)}</div>
        </section>
      </aside>
    </div>
  </div></LoadTransition>;
}

import { useState } from "react";
import { Link } from "../navigation";
import { ArrowRight, CalendarDays, FileText } from "../icons";
import { useAuth } from "../auth";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, PageSkeleton } from "../components/States";
import { LoadTransition } from "../components/Motion";
import { useApi } from "../useApi";
import { formatDayMonth, formatFullDate, plural } from "../utils";
import { CampusMaterial } from "../components/CampusMaterial";
import { BitmapAccent } from "../components/BitmapAccent";

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi("/dashboard");
  const [motionOn, setMotionOn] = useState(true);
  if (loading) return <LoadTransition phase="loading"><PageSkeleton /></LoadTransition>;
  if (error) return <LoadTransition phase="error"><div className="page"><PageHeader title="Кампус" /><ErrorState onRetry={reload} /></div></LoadTransition>;
  const next=data.nextLesson;
  const lessons=data.today.lessons;
  return <LoadTransition phase="ready"><div className="page home-workspace">
    <header className="home-heading"><div><h1>{user.firstName}, что в планах?</h1><p>{formatFullDate(data.today.date)}</p></div><nav className="home-brief" aria-label="Сводка"><Link to="/schedule" className="brief-study"><b>{lessons.length}</b>{plural(lessons.length,"пара","пары","пар")} сегодня</Link><Link to="/requests" className="brief-docs"><b>{data.stats.activeRequests}</b>{plural(data.stats.activeRequests,"заявка","заявки","заявок")} в работе</Link><Link to="/grades" className={data.stats.debts ? "brief-risk" : "brief-good"}><b>{data.stats.debts}</b>{data.stats.debts ? "долгов" : "долгов"}</Link></nav></header>
    <div className="home-board">
      <div className="home-study">
        {next && <section className="home-next" aria-label="Ближайшее занятие"><div className="home-next-top"><span>Следующая пара · {formatDayMonth(next.date)}</span><Link to="/schedule" aria-label="Открыть расписание"><ArrowRight size={24}/></Link></div><div className="home-next-body"><b>{next.lesson.start}</b><h2>{next.lesson.subject}</h2><p>ауд. {next.lesson.room} · {next.lesson.building}</p><small>{next.lesson.teacher}</small></div><div className="home-material" aria-hidden="true"><CampusMaterial variant="hero" animated={motionOn}/></div><button className="home-motion" onClick={()=>setMotionOn(value=>!value)} aria-pressed={!motionOn}>{motionOn ? "Остановить фон" : "Включить движение"}</button></section>}
        <section className="home-today"><header><h2>Твой день</h2><Link to="/schedule">Вся неделя <ArrowRight size={16}/></Link></header>{lessons.length ? lessons.map(lesson=><Link to="/schedule" className="home-lesson" key={lesson.id}><span>{lesson.start}<small>{lesson.end}</small></span><div><b>{lesson.subject}</b><small>ауд. {lesson.room} · {lesson.type}</small>{lesson.change&&<em>{lesson.change.note}</em>}</div><ArrowRight size={18}/></Link>) : <p>Сегодня без пар. Можно заняться своими делами.</p>}</section>
      </div>
      <aside className="home-actions" aria-label="Действия и внимание">
        <Link to="/plan" className="home-plan"><span>Время на своё</span><h2>Впишем<br/>в твой день.</h2><BitmapAccent/><span className="home-cta">Найти свободное окно <ArrowRight size={20}/></span></Link>
        <Link to="/requests?new=1" className="home-docs" aria-label="Новая заявка"><FileText size={24}/><div><h2>Нужен документ?</h2><p>Справка или заявление</p></div><ArrowRight size={22}/></Link>
        {data.stats.debts>0 ? <Link to="/grades" className="home-attention is-urgent"><b>{data.stats.debts} дисциплин требуют пересдачи</b><p>Выбери один долг. Помощник найдёт время на подготовку.</p><span>Разобрать долги <ArrowRight size={18}/></span></Link> : data.deadlines.length>0 ? <Link to="/notifications" className="home-attention"><span>Ближайший срок · {formatDayMonth(data.deadlines[0].dueDate)}</span><b>{data.deadlines[0].title}</b><span>Проверить условия <ArrowRight size={18}/></span></Link> : <div className="home-attention is-calm"><CalendarDays size={24}/><b>Горящих сроков нет</b><p>Личный план поможет сохранить время для себя.</p></div>}
      </aside>
    </div>
  </div></LoadTransition>;
}

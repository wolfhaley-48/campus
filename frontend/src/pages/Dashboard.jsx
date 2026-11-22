import { useEffect, useState } from "react";
import { Link } from "../navigation";
import { ArrowRight, FileText } from "../icons";
import { useAuth } from "../auth";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, PageSkeleton } from "../components/States";
import { LoadTransition } from "../components/Motion";
import { useApi } from "../useApi";
import { formatDayMonth, formatFullDate, plural } from "../utils";
import { CampusMaterial } from "../components/CampusMaterial";
import { ReactiveLink, ReactivePanel } from "../components/ReactiveSurface";
import { BitmapAccent } from "../components/BitmapAccent";
import { NewsWall } from "../components/NewsWall";
import { ChatPreview } from "../components/ChatPreview";

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi("/dashboard");
  const [motionOn, setMotionOn] = useState(true);
  const [wide, setWide] = useState(
    () => window.matchMedia("(min-width:721px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width:721px)");
    const update = () => setWide(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  if (loading)
    return (
      <LoadTransition phase="loading">
        <PageSkeleton />
      </LoadTransition>
    );
  if (error)
    return (
      <div className="page">
        <PageHeader title="Кампус" />
        <ErrorState onRetry={reload} />
      </div>
    );
  const next = data.nextLesson,
    lessons = data.today.lessons;
  return (
    <LoadTransition phase="ready">
      <div className="page home-workspace">
        <header className="home-heading">
          <div>
            <h1>{user.firstName}, что в планах?</h1>
            <p>{formatFullDate(data.today.date)}</p>
          </div>
          <nav className="home-brief" aria-label="Сводка">
            <Link to="/schedule" className="brief-study">
              <b>{lessons.length}</b>
              {plural(lessons.length, "пара", "пары", "пар")} сегодня
            </Link>
            <Link to="/requests" className="brief-docs">
              <b>{data.stats.activeRequests}</b>заявки в работе
            </Link>
            <Link
              to="/grades"
              className={data.stats.debts ? "brief-risk" : "brief-good"}
            >
              <b>{data.stats.debts}</b>долгов
            </Link>
          </nav>
        </header>
        <div className="home-quick-actions">
          <ReactiveLink to="/plan" className="home-plan">
            <span>Время на своё</span>
            <h2>Впишем в твой день.</h2>
            <BitmapAccent />
            <span className="home-cta">
              Найти свободное окно <ArrowRight size={20} />
            </span>
          </ReactiveLink>
          <ReactiveLink
            to="/requests?new=1"
            className="home-docs"
            aria-label="Новая заявка"
          >
            <FileText size={24} />
            <div>
              <h2>Нужен документ?</h2>
              <p>Справка или заявление</p>
            </div>
            <ArrowRight size={22} />
          </ReactiveLink>
          <Link className="home-social-jump" to="/social">
            <span>Социалка</span>
            <b>Свои на связи ↗</b>
          </Link>
        </div>
        <div className="home-social">
          <aside className="home-context" aria-label="Твой день и чаты">
            <ChatPreview />
            <details className="home-study-context" open={wide}>
              <summary>
                {next ? `Следующая пара · ${next.lesson.start}` : "Твоя учёба"}{" "}
                <span>↘</span>
              </summary>
              {next && (
                <ReactivePanel
                  className="home-next"
                  aria-label="Ближайшее занятие"
                >
                  <div className="home-next-top">
                    <span>Следующая пара · {formatDayMonth(next.date)}</span>
                    <Link to="/schedule" aria-label="Открыть расписание">
                      <ArrowRight size={24} />
                    </Link>
                  </div>
                  <div className="home-next-body">
                    <b>{next.lesson.start}</b>
                    <h2>{next.lesson.subject}</h2>
                    <p>
                      ауд. {next.lesson.room} · {next.lesson.building}
                    </p>
                    <small>{next.lesson.teacher}</small>
                  </div>
                  <div className="home-material" aria-hidden="true">
                    <CampusMaterial variant="hero" animated={motionOn} />
                  </div>
                  <button
                    className="home-motion"
                    onClick={() => setMotionOn((value) => !value)}
                  >
                    {motionOn ? "Остановить фон" : "Включить движение"}
                  </button>
                </ReactivePanel>
              )}
              {lessons.length > 0 ? (
                <section className="home-day-summary">
                  <h2>Ещё сегодня</h2>
                  {lessons.map((lesson) => (
                    <Link key={lesson.id} to="/schedule">
                      <b>{lesson.start}</b>
                      <span>{lesson.subject}</span>
                    </Link>
                  ))}
                </section>
              ) : (
                <p className="day-off-note">
                  Сегодня без пар. Забирай время на свои дела.
                </p>
              )}
              {data.stats.debts > 0 ? (
                <ReactiveLink to="/grades" className="home-attention is-urgent">
                  <b>{data.stats.debts} дисциплин ждут пересдачи</b>
                  <p>Разберём по одной. Начни с самой близкой.</p>
                  <span>
                    Разобрать долги <ArrowRight size={18} />
                  </span>
                </ReactiveLink>
              ) : (
                data.deadlines.length > 0 && (
                  <ReactiveLink to="/notifications" className="home-attention">
                    <span>До {formatDayMonth(data.deadlines[0].dueDate)}</span>
                    <b>{data.deadlines[0].title}</b>
                    <span>
                      Что нужно сделать <ArrowRight size={18} />
                    </span>
                  </ReactiveLink>
                )
              )}
              {data.requests?.length > 0 && (
                <section className="home-request-updates">
                  <header>
                    <h2>Что с заявками</h2>
                    <Link to="/requests">Все →</Link>
                  </header>
                  {data.requests.map((item) => (
                    <Link key={item.id} to={`/requests/${item.id}`}>
                      <b>{item.typeLabel}</b>
                      <span>{item.statusLabel}</span>
                    </Link>
                  ))}
                </section>
              )}
            </details>
          </aside>
          <NewsWall />
        </div>
      </div>
    </LoadTransition>
  );
}

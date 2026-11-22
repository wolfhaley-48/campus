import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Link } from "../navigation";
import { api } from "../api";
import { useApi } from "../useApi";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, PageSkeleton } from "../components/States";
import { formatDayMonth } from "../utils";
import { ArrowRight, Check, Plus, X } from "../icons";

export default function Plan() {
  const [params] = useSearchParams();
  const requestedDuration = Number(params.get("duration"));
  const [duration, setDuration] = useState([30,45,60,90].includes(requestedDuration) ? requestedDuration : 45);
  const [title, setTitle] = useState((params.get("task") || "").slice(0,120));
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { data, loading, error, reload } = useApi(`/plan?duration=${duration}`);
  const notifications = useApi("/notifications");
  const deadlines = notifications.data?.notifications.filter(item => item.dueDate) || [];
  const save = async (day, slot) => {
    if (busy) return;
    if (!title.trim()) { setMessage("Сначала напиши, чем хочешь заняться."); document.getElementById("plan-title")?.focus(); return; }
    setBusy(true); setMessage("");
    try {
      await api.post("/plan", { title, duration, date: day.date, start: slot.start });
      await reload(); setSelected(null); setMessage("Задача в плане. Это время учтено при поиске следующих окон.");
    } catch (error) { setMessage(error.message); await reload(); }
    finally { setBusy(false); }
  };
  const remove = async id => {
    if (busy) return;
    setBusy(true);
    try { await api.delete(`/plan/${id}`); await reload(); setMessage("Время снова свободно."); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <div className="page plan-page">
    <PageHeader title="План без накладок" subtitle="Найди время для своих дел. Пары уже учтены." />
    <div className="plan-intro">
      <div><label htmlFor="plan-title">Что хочешь успеть?</label><input id="plan-title" className="input" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, подготовить презентацию" /></div>
      <fieldset><legend>Сколько времени нужно?</legend><div className="duration-choices">{[30,45,60,90].map(value => <button className="btn" type="button" key={value} aria-pressed={value === duration} disabled={busy} onClick={() => { setDuration(value); setSelected(null); }}>{value} мин</button>)}</div></fieldset>
    </div>
    <p className="plan-explanation">7 дней · 09:00–18:00 по Москве. Пары и твои дела учтены. Дорогу добавь самостоятельно.</p>
    {selected && <div className="plan-confirm"><span>{formatDayMonth(selected.day.date)} · {selected.slot.start}–{selected.slot.suggestedEnd}</span><button className="btn btn-primary" disabled={busy} onClick={() => save(selected.day, selected.slot)}>Добавить в план</button></div>}
    {message && <p className="plan-message" role="status">{message}</p>}
    {error ? <ErrorState onRetry={reload} /> : loading ? <PageSkeleton /> : data && <div className="plan-layout">
      <section className="plan-windows" aria-label="Свободные окна">{data.days.map(day => <div className="plan-day" key={day.date}><div><h2>{formatDayMonth(day.date)}</h2><small>{day.lessonCount ? `Занятий: ${day.lessonCount}` : "День без пар"}</small></div><div className="plan-slots">{day.windows.length ? day.windows.map(slot => <button className="plan-slot" disabled={busy} key={slot.start} aria-pressed={selected?.day.date === day.date && selected?.slot.start === slot.start} onClick={() => setSelected({day, slot})} aria-label={`Запланировать ${formatDayMonth(day.date)} с ${slot.start} до ${slot.suggestedEnd}`}><b>{slot.start} — {slot.suggestedEnd}</b><span>Свободно до {slot.end} <Plus size={16} /></span></button>) : <p className="muted">Окна на {duration} минут не нашлись</p>}</div></div>)}</section>
      <aside className="plan-aside"><section><h2>Уже в плане</h2>{data.tasks.length ? data.tasks.map(task => <div className="plan-task" key={task.id}><Check size={18} /><div><b>{task.title}</b><small>{formatDayMonth(task.date)} · {task.start}–{task.end}</small></div><button className="icon-btn" disabled={busy} onClick={() => remove(task.id)} aria-label={`Удалить задачу ${task.title}`}><X size={16} /></button></div>) : <p>Выбери окно — и задача появится здесь. План сохраняется в твоём аккаунте.</p>}</section><section><h2>Держи в фокусе</h2>{deadlines.map(item => <div className="plan-deadline" key={item.id}><b>{item.title}</b><small>До {formatDayMonth(item.dueDate)}</small></div>)}{notifications.error && <p>Не удалось загрузить сроки. Проверь уведомления.</p>}<Link to="/notifications" className="text-link">Все уведомления <ArrowRight size={16} /></Link><Link to="/requests?new=1" className="text-link">Подать заявление <ArrowRight size={16} /></Link></section></aside>
    </div>}
  </div>;
}

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "../navigation";
import { api } from "../api";
import { ArrowRight, X, Plus } from "../icons";
import { CONTROL_SPRING } from "../motion";

const INTENTS = ["Найди 45 минут на подготовку", "Что изменилось в расписании?", "Как получить справку?", "Что с моей учёбой?"];

export function AssistantDock({ expanded, setExpanded, input, launcher }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const dock = useRef(null);
  const closePanel = () => {
    flushSync(() => setExpanded(false));
    launcher.current?.focus();
  };
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const keyboard = Math.max(0, window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0));
      dock.current?.style.setProperty("--dock-keyboard", `${keyboard}px`);
      dock.current?.style.setProperty("--dock-view-height", `${viewport?.height || window.innerHeight}px`);
    };
    update(); viewport?.addEventListener("resize",update); viewport?.addEventListener("scroll",update);
    return () => { viewport?.removeEventListener("resize",update); viewport?.removeEventListener("scroll",update); };
  }, []);
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : CONTROL_SPRING;
  const submit = async event => {
    event.preventDefault();
    if (!query.trim() || busy) return;
    setExpanded(true); setBusy(true); setFailure(""); setResult(null);
    try { setResult(await api.post("/assistant", { query })); }
    catch (error) { setFailure(error.message); }
    finally { setBusy(false); }
  };
  return <motion.aside ref={dock} layout className={`assistant-dock${expanded ? " is-expanded" : ""}`} transition={transition} aria-label="Помощник Кампуса" onKeyDown={event => {
    if (event.key === "Escape" && expanded) {
      event.preventDefault();
      event.stopPropagation();
      closePanel();
    }
  }}>
    <AnimatePresence initial={false}>{expanded && <motion.div key="panel" className="dock-panel" id="assistant-panel" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced ? 0 : 8}} transition={{duration:reduced ? 0 : .16}}>
      <header><b>Разберёмся вместе</b><button type="button" className="icon-btn" aria-label="Свернуть помощника" onClick={closePanel}><X size={18}/></button></header>
      <div className="dock-scroll">
        {busy && <p role="status">Сопоставляю расписание, сроки и личный план…</p>}
        {failure && <div role="alert" className="dock-error"><b>Ответ не получен</b><p>{failure}</p><Link to="/plan" onClick={()=>setExpanded(false)}>Найти время самостоятельно</Link></div>}
        {result && <section className="dock-result" aria-live="polite"><h2>От запроса — к действию</h2><p>{result.answer}</p>{result.tasks?.length > 0 && <div className="dock-tasks"><h3>Предложенные задачи</h3>{result.tasks.map((task,index)=><Link key={index} to={task.href} onClick={()=>setExpanded(false)}><span>{task.title}<small>{task.duration} минут · время выберешь дальше</small></span><ArrowRight size={18}/></Link>)}</div>}<div className="dock-actions">{result.actions.map(action=><Link key={action.href} to={action.href} onClick={()=>setExpanded(false)}>{action.label}<ArrowRight size={16}/></Link>)}</div><small>ИИ может ошибаться. Детали проверь перед действием.</small></section>}
        {!result && !busy && <div className="dock-suggestions">{INTENTS.map(text=><button type="button" key={text} onClick={()=>{setQuery(text);input.current?.focus();}}>{text}<Plus size={14}/></button>)}</div>}
      </div>
    </motion.div>}</AnimatePresence>
    <form onSubmit={submit} className="dock-compose">
      <button type="button" className="dock-toggle" onClick={closePanel} aria-expanded={expanded} aria-controls="assistant-panel" aria-label="Свернуть панель помощника">к.</button>
      <label className="sr-only" htmlFor="student-query">Что решаем?</label>
      <textarea ref={input} id="student-query" rows={expanded ? Math.min(4, Math.max(2, query.split("\n").length)) : 1} maxLength={1200} disabled={busy} value={query} onFocus={()=>setExpanded(true)} onChange={event=>setQuery(event.target.value)} placeholder="Что хочешь успеть?" onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();submit(event);}}}/>
      <button type="submit" className="dock-send" disabled={busy||!query.trim()} aria-label="Составить план с ИИ">{busy ? "…" : <ArrowRight size={22}/>}</button>
    </form>
  </motion.aside>;
}

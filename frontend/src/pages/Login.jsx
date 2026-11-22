import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Navigate, useLocation } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "../icons";
import { useAppNavigate } from "../navigation";

import { useAuth } from "../auth";
import { LogoMark } from "../components/Logo";
import { Avatar } from "../components/Avatar";
import { FullscreenLoader } from "../components/States";
import { Spinner } from "../components/Motion";
import { CONTENT_TRANSITION } from "../motion";

const PASSWORD = "kampus2026";

const DEMO_ACCOUNTS = [
  {
    login: "anna",
    name: "Анна Смирнова",
    meta: "3 курс · ПИ-23-1 · цифровые технологии",
    hue: 218,
  },
  {
    login: "maksim",
    name: "Максим Орлов",
    meta: "2 курс · ЭК-24-2 · экономика",
    hue: 28,
  },
];

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useAppNavigate();
  const location = useLocation();

  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const reduced = useReducedMotion();

  if (loading) return <FullscreenLoader />;
  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (!loginValue.trim() || !password) {
      setError("Введи логин и пароль.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(loginValue.trim().toLowerCase(), password);
      const target = location.state?.from || "/";
      navigate(target, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Не удалось войти. Проверь логин и пароль.");
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (account) => {
    setLoginValue(account.login);
    setPassword(PASSWORD);
    setError("");
  };

  return (
    <div className="login">
      <aside className="login-story" aria-label="О кабинете">
        <span className="login-story-tag">Твой учебный ритм</span>
        <h2>Все пары.<br />Все планы.<br />Один кампус.</h2>
        <p>Расписание, оценки и документы — рядом, когда нужны.</p>
      </aside>
      <motion.main className="login-form-side" initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={CONTENT_TRANSITION}>
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <LogoMark size={32} />
            <span className="brand-word">кампус</span>
          </div>

          <div className="login-form-head">
            <h1>Вход в кабинет</h1>
            <p>Расписание, оценки и заявки в деканат.</p>
          </div>

          <form className="login-form" onSubmit={submit} noValidate>
            <label className="input-label">Логин
              <input className="input" value={loginValue} onChange={(event) => setLoginValue(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} name="login" required aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} />
            </label>
            <label className="input-label">Пароль
              <span className="password-input">
                <input className="input" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" name="password" required aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>

            <AnimatePresence initial={false}>{error && (
              <motion.div className="form-error" id="login-error" role="alert" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduced ? { duration: 0 } : CONTENT_TRANSITION}>
                {error}
              </motion.div>
            )}</AnimatePresence>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy} aria-busy={busy}>
              {busy ? "Входим…" : "Войти"}
              {busy ? <Spinner size={17} /> : <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />}
            </button>
          </form>

          <section className="demo-block" aria-labelledby="demo-title">
            <div className="demo-head">
              <span id="demo-title">Тестовые аккаунты</span>
              <span>Пароль: <code>{PASSWORD}</code></span>
            </div>
            <div className="demo-list">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  type="button"
                  className="demo-account"
                  data-active={loginValue === account.login && password === PASSWORD ? "true" : undefined}
                  aria-pressed={loginValue === account.login && password === PASSWORD}
                  key={account.login}
                  onClick={() => fillDemo(account)}
                >
                  <Avatar user={account} size="sm" className="demo-avatar" />
                  <span className="demo-account-text">
                    <b>{account.name}</b>
                    <small>{account.meta}</small>
                  </span>
                  <span className="demo-login">{account.login}</span>
                </button>
              ))}
            </div>
          </section>

          <p className="login-footnote">
            Конкурсный прототип цифрового деканата.
            Неофициальный сервис университета. Все данные вымышлены.
          </p>
        </div>
      </motion.main>
    </div>
  );
}

import { useState } from "react";
import { useAppNavigate } from "../navigation";
import {
  AtSign,
  BookOpen,
  Building2,
  CalendarDays,
  IdCard,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from "../icons";

import { useAuth } from "../auth";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { Disclosure, Spinner } from "../components/Motion";
import { useToast } from "../toast";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useAppNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      toast({ kind: "info", title: "Вы вышли", body: "Сессия закрыта на этом устройстве." });
      navigate("/login", { replace: true });
    } catch (error) {
      toast({ kind: "error", title: "Не удалось выйти", body: error.message });
      setBusy(false);
    }
  };

  const rows = [
    { icon: UserRound, label: "ФИО", value: user.fullName },
    { icon: Building2, label: "Факультет", value: user.faculty },
    {
      icon: BookOpen,
      label: "Направление",
      value: `${user.directionCode} · ${user.direction}`,
    },
    { icon: CalendarDays, label: "Курс и группа", value: `${user.course} курс · ${user.group}` },
    { icon: IdCard, label: "Номер зачётки", value: user.studentCard },
    { icon: AtSign, label: "Email", value: user.email },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Профиль"
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={signOut} disabled={busy} aria-busy={busy}>
            {busy ? <Spinner size={15} /> : <LogOut size={15} strokeWidth={1.9} aria-hidden="true" />}
            {busy ? "Выходим…" : "Выйти"}
          </button>
        }
      />

      <div className="profile-grid">
      <section className="profile-hero">
        <Avatar user={user} size="lg" />
        <div className="profile-hero-main">
          <span className="pill pill-lime">Тестовый аккаунт</span>
          <h2>{user.fullName}</h2>
        </div>
        <div className="profile-hero-tags">
          <span>{user.group}</span>
          <span>{user.course} курс</span>
          <span>{user.studyForm}</span>
        </div>
      </section>

      <div className="profile-content">
        <section>
          <div className="card-head">
            <h2 className="card-title">Учётные данные</h2>
            <span className="pill pill-neutral">из деканата</span>
          </div>

          <dl className="profile-list">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="profile-row">
                  <dt>
                    <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                    {row.label}
                  </dt>
                  <dd>{row.value}</dd>
                </div>
              );
            })}
            <div className="profile-row">
              <dt>
                <CalendarDays size={15} strokeWidth={1.8} aria-hidden="true" />
                Год поступления
              </dt>
              <dd>{user.enrolledYear}</dd>
            </div>
          </dl>
        </section>

          <Disclosure className="security-details" title="Как защищены данные">

            <ul className="security-list">
              <li>
                <span className="security-icon">
                  <KeyRound size={16} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <b>Пароль</b>
                   <p>На сервере хранится scrypt-хеш, а не открытый пароль.</p>
                </div>
              </li>
              <li>
                <span className="security-icon">
                  <ShieldCheck size={16} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <b>Сессия</b>
                  <p>
                    JWT в httpOnly-cookie, SameSite=Lax. Скрипт на странице не может прочитать
                    токен.
                  </p>
                </div>
              </li>
              <li>
                <span className="security-icon">
                  <UserRound size={16} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <b>Доступ к данным</b>
                  <p>
                    Сервер фильтрует оценки и заявки по ID пользователя из токена.
                    Чужой номер заявки вернёт 404.
                  </p>
                </div>
              </li>
            </ul>
          </Disclosure>

          <div className="profile-demo">
            <b>Демо-прототип для конкурса</b>
            <p>
              Неофициальный сервис университета. ФИО, оценки, заявки и номера зачёток
              вымышлены. Второй аккаунт: <code>maksim</code> / <code>kampus2026</code>.
            </p>
          </div>
      </div>
      </div>
    </div>
  );
}

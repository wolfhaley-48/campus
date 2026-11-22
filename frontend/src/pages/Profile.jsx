import { useState } from "react";
import { Link, useAppNavigate } from "../navigation";
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
    { icon: Building2, label: "Факультет", value: user.faculty },
    {
      icon: BookOpen,
      label: "Направление",
      value: `${user.directionCode} · ${user.direction}`,
    },
    { icon: IdCard, label: "Номер зачётки", value: user.studentCard },
    { icon: AtSign, label: "Email", value: <a href={`mailto:${user.email}`}>{user.email}</a> },
  ];

  return (
    <div className="page profile-page">
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
            <h2 className="card-title">Про твою учёбу</h2>
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
              <li><ShieldCheck size={20} /><div><b>Только твой аккаунт</b><p>Оценки, заявки и личный план доступны после входа. Другой студент не может открыть их по ссылке.</p></div></li>
              <li><KeyRound size={20} /><div><b>Общее устройство</b><p>Закрой сессию кнопкой «Выйти», если пользуешься чужим компьютером.</p></div></li>
            </ul>
          </Disclosure>

          <Link className="profile-plan-link" to="/plan">Открыть личный план <CalendarDays size={20} /></Link>
      </div>
      </div>
    </div>
  );
}

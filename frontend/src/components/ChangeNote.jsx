import { ArrowLeftRight, Ban, Info, UserRoundCheck } from "../icons";

const META = {
  moved: { icon: ArrowLeftRight, label: "Перенос" },
  cancelled: { icon: Ban, label: "Отмена" },
  substitute: { icon: UserRoundCheck, label: "Замена" },
};

export function ChangeNote({ change, compact = false }) {
  if (!change) return null;
  const meta = META[change.kind] || { icon: Info, label: "Изменение" };
  const Icon = meta.icon;
  return (
    <div className={`change-note${compact ? " change-note-compact" : ""}`} data-kind={change.kind}>
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      {!compact && !change.note?.toLocaleLowerCase("ru").startsWith(meta.label.toLocaleLowerCase("ru")) && <span className="change-label">{meta.label}</span>}
      <span>{change.note}</span>
    </div>
  );
}

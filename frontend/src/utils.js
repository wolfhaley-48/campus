export const WEEKDAYS = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

export function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDayMonth(value) {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatDayShort(value) {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date) return "";
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatFullDate(value) {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date) return "";
  return `${WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatDateRange(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return "";
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${start.getDate()}–${end.getDate()} ${MONTHS[start.getMonth()]}`
    : `${formatDayShort(start)} — ${formatDayShort(end)}`;
}

export function formatTimeRange(start, end) {
  return `${start}–${end}`;
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hours}:${minutes}`;
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн назад`;
  return formatDayMonth(new Date(iso).toISOString().slice(0, 10));
}

export function daysUntil(dateString) {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDate(dateString);
  if (!target) return null;
  return Math.round((target - today) / 86400000);
}

export function dayLabel(dateString, todayString) {
  if (!dateString) return "";
  if (dateString === todayString) return "Сегодня";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (dateString === tomorrowString) return "Завтра";
  const date = parseDate(dateString);
  return `${WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function plural(count, one, few, many) {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function daysWord(count) {
  return plural(count, "день", "дня", "дней");
}

export function initials(fullName = "") {
  const parts = fullName.trim().split(/\s+/);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

export function gradeTone(grade) {
  if (grade === "Зачтено" || grade === 5) return "excellent";
  if (grade === 4) return "good";
  if (grade === 3) return "warn";
  return "pending";
}

export function requestStatusTone(status) {
  if (status === "ready") return "success";
  if (status === "in_progress") return "info";
  if (status === "rejected") return "danger";
  return "neutral";
}

export function lessonTypeTone(type = "") {
  const normalized = type.toLowerCase();
  if (normalized.includes("лекция")) return "lecture";
  if (normalized.includes("лаборатор")) return "lab";
  if (normalized.includes("практик")) return "practice";
  if (normalized.includes("консульт")) return "consult";
  if (normalized.includes("физ")) return "sport";
  return "neutral";
}

export function categoryLabel(category) {
  return (
    {
      dean: "Деканат",
      schedule: "Расписание",
      request: "Заявки",
      deadline: "Дедлайн",
    }[category] || "Событие"
  );
}

export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

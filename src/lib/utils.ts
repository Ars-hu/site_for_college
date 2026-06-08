import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toApiDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(date: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  }).format(typeof date === "string" ? new Date(`${date}T00:00:00`) : date);
}

export function startOfCalendar(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

export function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function normalizeToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const local =
    d.startsWith("7") || d.startsWith("8") ? d.slice(1, 11) : d.slice(0, 10);
  if (!local.length) return "";
  if (local.length <= 3) return `+7 (${local}`;
  if (local.length <= 6) return `+7 (${local.slice(0, 3)}) ${local.slice(3)}`;
  if (local.length <= 8)
    return `+7 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  return `+7 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 8)}-${local.slice(8, 10)}`;
}

export const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

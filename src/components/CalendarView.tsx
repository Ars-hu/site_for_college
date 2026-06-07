import { useMemo } from "react";
import { BLUE, BLUE_LIGHT, WEEK_DAYS } from "../lib/constants";
import { isSameDate, normalizeToday, startOfCalendar, toApiDate } from "../lib/utils";
import { MonthNav } from "./MonthNav";
import type { AllowedMonth } from "../lib/api";

function ymKey(year: number, month: number) {
  return `${year}-${month}`;
}

export function CalendarView({
  month,
  blockedDates,
  fullDates,
  openedWeekends,
  allowedMonths,
  onMonthChange,
  onDateSelect,
}: {
  month: Date;
  blockedDates: string[];
  fullDates: string[];
  openedWeekends: string[];
  allowedMonths: AllowedMonth[];
  onMonthChange: (d: Date) => void;
  onDateSelect: (d: Date) => void;
}) {
  const today = normalizeToday();
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const fullSet = useMemo(() => new Set(fullDates), [fullDates]);
  const openedWeekendsSet = useMemo(() => new Set(openedWeekends), [openedWeekends]);
  const allowedSet = useMemo(
    () => new Set(allowedMonths.map((m) => ymKey(m.year, m.month))),
    [allowedMonths]
  );
  const days = useMemo(() => {
    const start = startOfCalendar(month);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const title = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(month);
  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canGoBack = allowedSet.has(ymKey(prevMonth.getFullYear(), prevMonth.getMonth() + 1));
  const canGoForward = allowedSet.has(ymKey(nextMonth.getFullYear(), nextMonth.getMonth() + 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2
            className="text-xl font-semibold capitalize"
            style={{ color: BLUE }}
          >
            {title}
          </h2>
          <p className="text-sm text-gray-500">
            {allowedMonths.length > 0
              ? `Доступна запись: ${allowedMonths
                  .map((m) =>
                    new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(
                      new Date(m.year, m.month - 1, 1)
                    )
                  )
                  .join(", ")}, Пн–Пт.`
              : "Запись временно недоступна."}
          </p>
        </div>
        <MonthNav
          month={month}
          onMonthChange={onMonthChange}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />
      </div>

      <div className="grid grid-cols-7 pb-2 text-center text-xs font-semibold uppercase text-gray-400 border-b border-gray-200">
        {WEEK_DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 border border-gray-200 rounded-lg overflow-hidden">
        {days.map((day) => {
          const apiDate = toApiDate(day);
          const outOfMonth = day.getMonth() !== month.getMonth();
          const isPast = day < today;
          const isBlocked = blockedSet.has(apiDate);
          const isFull = fullSet.has(apiDate);
          const notAllowed = !allowedSet.has(ymKey(day.getFullYear(), day.getMonth() + 1));
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isOpenedWeekend = isWeekend && openedWeekendsSet.has(apiDate);
          const disabled =
            outOfMonth || isPast || isBlocked || isFull || notAllowed ||
            (isWeekend && !isOpenedWeekend);
          const isToday = isSameDate(day, today);

          const inRange = !outOfMonth && !isPast && !notAllowed &&
            (!isWeekend || isOpenedWeekend);

          const isAvailable = inRange && !isBlocked && !isFull;
          const cellBg = disabled
            ? "#fafafa"
            : isAvailable
            ? "#d1fae5"
            : isFull && inRange
            ? "#fee2e2"
            : "#fff";
          const cellBgHover = isAvailable ? "#a7f3d0" : BLUE_LIGHT;

          return (
            <button
              key={day.toISOString()}
              disabled={disabled}
              onClick={() => onDateSelect(day)}
              className="min-h-20 border-b border-r border-gray-200 p-2 text-left"
              style={{
                background: cellBg,
                color: disabled ? "#ccc" : "inherit",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.background = cellBgHover;
              }}
              onMouseLeave={(e) => {
                if (!disabled) e.currentTarget.style.background = cellBg;
              }}
            >
              <span
                className="inline-grid h-7 w-7 place-items-center rounded-full text-sm font-semibold"
                style={isToday ? { background: BLUE, color: "#fff" } : {}}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#d1fae5", border: "1px solid #6ee7b7" }} />
          Есть свободные места
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }} />
          Мест нет
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#fafafa", border: "1px solid #e5e7eb" }} />
          Недоступно
        </span>
      </div>
    </div>
  );
}

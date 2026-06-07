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

          return (
            <button
              key={day.toISOString()}
              disabled={disabled}
              onClick={() => onDateSelect(day)}
              className="min-h-20 border-b border-r border-gray-200 p-2 text-left"
              style={{
                background: disabled ? "#fafafa" : "#fff",
                color: disabled ? "#ccc" : "inherit",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.background = BLUE_LIGHT;
              }}
              onMouseLeave={(e) => {
                if (!disabled) e.currentTarget.style.background = "#fff";
              }}
            >
              <span
                className="inline-grid h-7 w-7 place-items-center rounded-full text-sm font-semibold"
                style={isToday ? { background: BLUE, color: "#fff" } : {}}
              >
                {day.getDate()}
              </span>

              {inRange && !isBlocked && !isFull && (
                <span className="mt-1 block text-xs font-medium text-green-700">
                  Есть места
                </span>
              )}
              {inRange && isFull && !isBlocked && (
                <span className="mt-1 block text-xs font-medium text-red-500">
                  Нет мест
                </span>
              )}
              {inRange && isBlocked && (
                <span className="mt-1 block text-xs font-medium text-gray-400">
                  Закрыто
                </span>
              )}
              {inRange && isWeekend && (
                <span className="mt-1 block text-xs font-medium text-gray-400">
                  Выходной
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

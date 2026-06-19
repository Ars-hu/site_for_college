import { useMemo } from "react";
import { BLUE, BLUE_LIGHT, TIME_SLOTS, WEEK_DAYS } from "../lib/constants";
import { isSameDate, normalizeToday, startOfCalendar, toApiDate } from "../lib/utils";
import { MonthNav } from "./ui/MonthNav";
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
  serverDate,
  serverNow,
  onMonthChange,
  onDateSelect,
}: {
  month: Date;
  blockedDates: string[];
  fullDates: string[];
  openedWeekends: string[];
  allowedMonths: AllowedMonth[];
  serverDate: string | null;
  serverNow: Date | null;
  onMonthChange: (d: Date) => void;
  onDateSelect: (d: Date) => void;
}) {
  // Use server date when admin has set manual clock, fallback to browser date
  const today = (() => {
    if (serverDate) {
      const [y, m, d] = serverDate.split("-").map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    return normalizeToday();
  })();
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
  const findPrevAllowed = (): Date | null => {
    let d = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    for (let i = 0; i < 24; i++) {
      if (allowedSet.has(ymKey(d.getFullYear(), d.getMonth() + 1))) return d;
      d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    }
    return null;
  };

  const findNextAllowed = (): Date | null => {
    let d = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    for (let i = 0; i < 24; i++) {
      if (allowedSet.has(ymKey(d.getFullYear(), d.getMonth() + 1))) return d;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return null;
  };

  const prevAllowed = findPrevAllowed();
  const nextAllowed = findNextAllowed();
  const canGoBack = prevAllowed !== null;
  const canGoForward = nextAllowed !== null;
  const handlePrev = () => { if (prevAllowed) onMonthChange(prevAllowed); };
  const handleNext = () => { if (nextAllowed) onMonthChange(nextAllowed); };

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
        </div>
        <MonthNav
          month={month}
          onMonthChange={onMonthChange}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>

      <div className="grid grid-cols-7 pb-2 text-center text-xs font-semibold uppercase text-gray-400 border-b border-gray-200">
        {WEEK_DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const apiDate = toApiDate(day);
          const outOfMonth = day.getMonth() !== month.getMonth();
          const isPast = day < today;
          const isBlocked = blockedSet.has(apiDate);
          const isFull = fullSet.has(apiDate);
          const notAllowed = !allowedSet.has(ymKey(day.getFullYear(), day.getMonth() + 1));
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isOpenedWeekend = isWeekend && openedWeekendsSet.has(apiDate);
          const isToday = isSameDate(day, today);
          // Block day if ALL slots fall within the next 24h window
          const isAllSlotsPast = (() => {
            const cutoff = new Date((serverNow ?? new Date()).getTime() + 24 * 60 * 60 * 1000);
            const lastSlot = TIME_SLOTS[TIME_SLOTS.length - 1];
            const lastSlotDate = new Date(day);
            lastSlotDate.setHours(
              parseInt(lastSlot.split(":")[0]),
              parseInt(lastSlot.split(":")[1]),
              0, 0
            );
            return lastSlotDate <= cutoff;
          })();
          const disabled =
            outOfMonth || isPast || isBlocked || isFull || notAllowed ||
            (isWeekend && !isOpenedWeekend) || isAllSlotsPast;

          const inRange = !outOfMonth && !isPast && !notAllowed &&
            (!isWeekend || isOpenedWeekend);

          const isAvailable = inRange && !isBlocked && !isFull;
          const cellBg = outOfMonth
            ? "transparent"
            : isFull && inRange
            ? "#F9E3E2"
            : disabled
            ? "#f3f4f6"
            : isAvailable
            ? "#d1fae5"
            : "#fff";
          const cellBgHover = isAvailable ? "#a7f3d0" : BLUE_LIGHT;

          return (
            <button
              key={day.toISOString()}
              disabled={disabled || outOfMonth}
              onClick={() => !disabled && !outOfMonth && onDateSelect(day)}
              className="aspect-square rounded-xl flex items-center justify-center border border-gray-200"
              style={{
                background: cellBg,
                color: outOfMonth ? "transparent" : disabled ? "#ccc" : "inherit",
                cursor: disabled || outOfMonth ? "not-allowed" : "pointer",
                borderColor: outOfMonth ? "transparent" : undefined,
              }}
              onMouseEnter={(e) => {
                if (!disabled && !outOfMonth) e.currentTarget.style.background = cellBgHover;
              }}
              onMouseLeave={(e) => {
                if (!disabled && !outOfMonth) e.currentTarget.style.background = cellBg;
              }}
            >
              <span
                className="inline-grid h-9 w-9 place-items-center rounded-full text-base font-semibold"
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
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#F9E3E2", border: "1px solid #fca5a5" }} />
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

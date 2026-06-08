import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CalendarDays, Minus, Plus } from "lucide-react";
import { getAdminAllowedMonths, getBlockedDates, getSlotConfigs, toggleDate, toggleWeekend, updateSlot } from "../lib/api";
import type { AllowedMonth } from "../lib/api";
import { BLUE, BLUE_LIGHT, TIME_SLOTS, WEEK_DAYS } from "../lib/constants";
import { formatDisplayDate, isSameDate, normalizeToday, startOfCalendar, toApiDate } from "../lib/utils";
import { MonthNav } from "./MonthNav";

export function ScheduleTab({
  token,
  onAuthError,
}: {
  token: string;
  onAuthError: () => void;
}) {
  const [month, setMonth] = useState(() => new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [openedWeekends, setOpenedWeekends] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotConfigs, setSlotConfigs] = useState<
    Record<string, { max_capacity: number; is_blocked: boolean; occupied: number }>
  >({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [togglingDate, setTogglingDate] = useState(false);

  const [allowedMonths, setAllowedMonths] = useState<AllowedMonth[]>([]);

  useEffect(() => {
    getAdminAllowedMonths(token)
      .then(setAllowedMonths)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    getBlockedDates(token)
      .then((d) => {
        setBlockedDates(d.blocked_dates);
        setOpenedWeekends(d.opened_weekends);
      })
      .catch((e) => {
        if (e.message === "Нет доступа" || e.message?.includes("401"))
          onAuthError();
        else toast.error(e.message);
      });
  }, [token, onAuthError]);

  const loadSlotConfigs = (date: string) => {
    setLoadingSlots(true);
    getSlotConfigs(token, date)
      .then((d) => setSlotConfigs(d))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingSlots(false));
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    loadSlotConfigs(date);
  };

  const handleToggleDate = async () => {
    if (!selectedDate) return;
    setTogglingDate(true);
    try {
      const res = await toggleDate(token, selectedDate);
      setBlockedDates((prev) =>
        res.blocked
          ? [...prev, selectedDate]
          : prev.filter((d) => d !== selectedDate)
      );
      toast.success(
        res.blocked ? "Дата закрыта для записи" : "Дата открыта для записи"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setTogglingDate(false);
    }
  };

  const handleToggleSlot = async (time: string) => {
    if (!selectedDate) return;
    const newBlocked = !slotConfigs[time]?.is_blocked;
    try {
      await updateSlot(token, selectedDate, time, { is_blocked: newBlocked });
      setSlotConfigs((prev) => ({
        ...prev,
        [time]: { ...prev[time], is_blocked: newBlocked },
      }));
      toast.success(newBlocked ? `${time} — закрыто` : `${time} — открыто`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleCapacityChange = async (time: string, delta: number) => {
    if (!selectedDate) return;
    const newCap = Math.max(1, (slotConfigs[time]?.max_capacity ?? 3) + delta);
    try {
      await updateSlot(token, selectedDate, time, { max_capacity: newCap });
      setSlotConfigs((prev) => ({
        ...prev,
        [time]: { ...prev[time], max_capacity: newCap },
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleToggleWeekend = async () => {
    if (!selectedDate) return;
    setTogglingDate(true);
    try {
      const res = await toggleWeekend(token, selectedDate);
      setOpenedWeekends((prev) =>
        res.opened ? [...prev, selectedDate] : prev.filter((d) => d !== selectedDate)
      );
      toast.success(
        res.opened ? "Выходной открыт для записи" : "Выходной закрыт для записи"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setTogglingDate(false);
    }
  };

  const today = normalizeToday();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Set of "YYYY-M" for fast lookup
  const allowedMonthsSet = useMemo(
    () => new Set(allowedMonths.map((m) => `${m.year}-${m.month}`)),
    [allowedMonths]
  );

  const isMonthAllowed = (d: Date) => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const isPast = y < currentYear || (y === currentYear && m < currentMonth);
    if (isPast) return false;
    return allowedMonthsSet.has(`${y}-${m}`);
  };

  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  const findPrevAllowed = (): Date | null => {
    let d = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    for (let i = 0; i < 24; i++) {
      if (isMonthAllowed(d)) return d;
      d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    }
    return null;
  };

  const findNextAllowed = (): Date | null => {
    let d = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    for (let i = 0; i < 24; i++) {
      if (isMonthAllowed(d)) return d;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return null;
  };

  const prevAllowed = findPrevAllowed();
  const nextAllowed = findNextAllowed();
  const canGoBack = prevAllowed !== null;
  const canGoForward = nextAllowed !== null;
  const handlePrev = () => { if (prevAllowed) setMonth(prevAllowed); };
  const handleNext = () => { if (nextAllowed) setMonth(nextAllowed); };

  // If current displayed month is not allowed, snap to first allowed future month
  useEffect(() => {
    if (allowedMonths.length === 0) return;
    if (!isMonthAllowed(month)) {
      const future = allowedMonths
        .filter((m) => !(m.year < currentYear || (m.year === currentYear && m.month < currentMonth)))
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
      if (future.length > 0) {
        setMonth(new Date(future[0].year, future[0].month - 1, 1));
      }
    }
  }, [allowedMonths]);

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const openedWeekendsSet = useMemo(() => new Set(openedWeekends), [openedWeekends]);
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
  const isSelectedDateBlocked = selectedDate ? blockedSet.has(selectedDate) : false;

  const isSelectedDateWeekend = selectedDate
    ? (() => { const d = new Date(`${selectedDate}T00:00:00`); return d.getDay() === 0 || d.getDay() === 6; })()
    : false;

  const isSelectedWeekendOpened = selectedDate ? openedWeekendsSet.has(selectedDate) : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold capitalize" style={{ color: BLUE }}>
            {title}
          </h2>
          <MonthNav month={month} onMonthChange={setMonth} canGoBack={canGoBack} canGoForward={canGoForward} onPrev={handlePrev} onNext={handleNext} />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Нажмите на дату для управления. Серый — закрыта для записи.
        </p>
        <div className="grid grid-cols-7 pb-2 text-center text-xs font-semibold uppercase text-gray-400 border-b border-gray-200">
          {WEEK_DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {days.map((day) => {
            const outOfMonth = day.getMonth() !== month.getMonth();
            const apiDate = toApiDate(day);
            const blocked = blockedSet.has(apiDate);
            const isPast = day < today;
            const isMonthOk = isMonthAllowed(month);
            const isSelected = apiDate === selectedDate;
            const isToday = isSameDate(day, today);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isOpenedWeekend = isWeekend && openedWeekendsSet.has(apiDate);
            const disabled = outOfMonth || isPast || !isMonthOk;

            let bg = "#fff";
            if (outOfMonth) bg = "transparent";
            else if (isSelected) bg = BLUE_LIGHT;
            else if (isOpenedWeekend) bg = "#e8f5e9";
            else if (blocked) bg = "#f3f4f6";
            else if (isWeekend) bg = "#f3f4f6";

            return (
              <button
                key={day.toISOString()}
                disabled={disabled}
                onClick={() => !disabled && handleDayClick(apiDate)}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border border-gray-200"
                style={{
                  background: bg,
                  color: outOfMonth
                    ? "transparent"
                    : isPast || !isMonthOk
                    ? "#aaa"
                    : blocked
                    ? "#888"
                    : isWeekend && !isOpenedWeekend
                    ? "#bbb"
                    : "#222",
                  cursor: disabled ? "default" : "pointer",
                  borderColor: outOfMonth ? "transparent" : isSelected ? BLUE : undefined,
                  outline: isSelected ? `2px solid ${BLUE}` : "none",
                  outlineOffset: "-2px",
                }}
              >
                <span
                  className="inline-grid h-9 w-9 place-items-center rounded-full text-base font-semibold"
                  style={isToday ? { background: BLUE, color: "#fff" } : {}}
                >
                  {day.getDate()}
                </span>
                {blocked && !outOfMonth && (
                  <span className="text-xs text-gray-400 leading-none">закрыто</span>
                )}
                {isOpenedWeekend && !outOfMonth && (
                  <span className="text-xs font-medium text-green-700 leading-none">открыт</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {selectedDate ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: BLUE }}>
                {formatDisplayDate(selectedDate)}
              </h3>
              {isSelectedDateWeekend ? (
                <button
                  disabled={togglingDate}
                  onClick={handleToggleWeekend}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 transition"
                  style={{ background: isSelectedWeekendOpened ? "#757575" : "#388e3c" }}
                >
                  {togglingDate
                    ? "..."
                    : isSelectedWeekendOpened
                    ? "Закрыть выходной"
                    : "Открыть выходной"}
                </button>
              ) : (
                <button
                  disabled={togglingDate}
                  onClick={handleToggleDate}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 transition"
                  style={{ background: isSelectedDateBlocked ? "#388e3c" : "#757575" }}
                >
                  {togglingDate
                    ? "..."
                    : isSelectedDateBlocked
                    ? "Открыть день"
                    : "Закрыть день"}
                </button>
              )}
            </div>

            {isSelectedDateWeekend && !isSelectedWeekendOpened && (
              <div className="mb-4 rounded-lg p-3 text-sm font-medium border border-amber-200 text-amber-700 bg-amber-50">
                Выходной день — запись закрыта. Нажмите «Открыть выходной», чтобы разрешить запись.
              </div>
            )}
            {isSelectedDateBlocked && !isSelectedDateWeekend && (
              <div className="mb-4 rounded-lg p-3 text-sm font-medium border border-gray-300 text-gray-500 bg-gray-50">
                День закрыт — запись недоступна для абитуриентов.
              </div>
            )}

            <div className="text-xs text-gray-400 mb-3 uppercase tracking-wide">
              Временные слоты
            </div>

            {loadingSlots ? (
              <div className="text-center py-8 text-gray-400">Загрузка...</div>
            ) : (
              <div className="space-y-2">
                {TIME_SLOTS.map((time) => {
                  const cfg = slotConfigs[time];
                  const blocked = cfg?.is_blocked ?? false;
                  const cap = cfg?.max_capacity ?? 3;
                  const occupied = cfg?.occupied ?? 0;

                  return (
                    <div
                      key={time}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                      style={{
                        borderColor: blocked ? "#ccc" : "#e0e0e0",
                        background: blocked ? "#f5f5f5" : "#fff",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="font-bold text-sm w-12"
                          style={{ color: blocked ? "#aaa" : "inherit" }}
                        >
                          {time}
                        </span>
                        <span className="text-xs text-gray-400">
                          {occupied}/{cap} зап.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCapacityChange(time, -1)}
                            disabled={blocked || cap <= 1}
                            className="grid h-6 w-6 place-items-center rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-semibold w-5 text-center">
                            {cap}
                          </span>
                          <button
                            onClick={() => handleCapacityChange(time, 1)}
                            disabled={blocked}
                            className="grid h-6 w-6 place-items-center rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleToggleSlot(time)}
                          className="rounded px-2 py-1 text-xs font-semibold text-white transition"
                          style={{
                            background: blocked ? "#388e3c" : "#757575",
                            minWidth: 64,
                          }}
                        >
                          {blocked ? "Открыть" : "Закрыть"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
            <CalendarDays className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              Выберите дату в календаре
              <br />
              для управления расписанием
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

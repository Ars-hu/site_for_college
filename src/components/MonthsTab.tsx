import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";
import { getAdminAllowedMonths, addAllowedMonth, removeAllowedMonth } from "../lib/api";
import type { AllowedMonth } from "../lib/api";
import { BLUE } from "../lib/constants";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function MonthsTab({
  token,
  onAuthError,
}: {
  token: string;
  onAuthError: () => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const [months, setMonths] = useState<AllowedMonth[]>([]);
  const [newYear, setNewYear] = useState(currentYear);
  const [newMonth, setNewMonth] = useState(currentMonth);
  const [adding, setAdding] = useState(false);

  const isPastMonth = (year: number, month: number) =>
    year < currentYear || (year === currentYear && month < currentMonth);

  useEffect(() => {
    getAdminAllowedMonths(token)
      .then(setMonths)
      .catch((e) => {
        if (e.message?.includes("401") || e.message === "Нет доступа") onAuthError();
        else toast.error(e.message);
      });
  }, [token, onAuthError]);

  const handleAdd = async () => {
    if (isPastMonth(newYear, newMonth)) {
      toast.error("Нельзя добавить прошедший месяц");
      return;
    }
    setAdding(true);
    try {
      const added = await addAllowedMonth(token, newYear, newMonth);
      setMonths((prev) =>
        [...prev, added].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      );
      toast.success(`${MONTH_NAMES[added.month - 1]} ${added.year} добавлен`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (year: number, month: number) => {
    try {
      await removeAllowedMonth(token, year, month);
      setMonths((prev) => prev.filter((m) => !(m.year === year && m.month === month)));
      toast.success(`${MONTH_NAMES[month - 1]} ${year} удалён`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const yearOptions = [currentYear, currentYear + 1];

  // Months available in selector depend on selected year
  const availableMonths = MONTH_NAMES.map((name, i) => ({ name, value: i + 1 })).filter(
    ({ value }) => !isPastMonth(newYear, value)
  );

  // If current selection became past after year change, reset to first available
  const safeNewMonth = availableMonths.find((m) => m.value === newMonth)
    ? newMonth
    : availableMonths[0]?.value ?? currentMonth;

  return (
    <div className="max-w-lg">
      <p className="text-sm text-gray-500 mb-6">
        Выберите месяцы, в которые абитуриенты могут записываться. Изменения
        применяются немедленно.
      </p>

      {/* Текущие месяцы */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Открытые месяцы
        </p>
        {months.filter((m) => !isPastMonth(m.year, m.month)).length === 0 ? (
          <p className="text-sm text-gray-400 italic">Нет доступных месяцев — запись закрыта.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {months.filter((m) => !isPastMonth(m.year, m.month)).map((m) => (
              <div
                key={`${m.year}-${m.month}`}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white"
                style={{ background: BLUE }}
              >
                <span>{MONTH_NAMES[m.month - 1]} {m.year}</span>
                <button
                  onClick={() => handleRemove(m.year, m.month)}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-white/20 transition"
                  title="Удалить месяц"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Добавление нового месяца */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Добавить месяц
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={newYear}
            onChange={(e) => { setNewYear(Number(e.target.value)); }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
            style={{ minWidth: 90 }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={safeNewMonth}
            onChange={(e) => setNewMonth(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
            style={{ minWidth: 130 }}
          >
            {availableMonths.map(({ name, value }) => (
              <option key={value} value={value}>{name}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition"
            style={{ background: BLUE }}
          >
            {adding ? "Добавление..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

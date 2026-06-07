import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Clock,
  Download,
  LayoutList,
  Search,
} from "lucide-react";
import { type Application, getApplications } from "../lib/api";
import { BLUE, BLUE_LIGHT, TIME_SLOTS, WEEK_DAYS } from "../lib/constants";
import { formatDisplayDate, isSameDate, normalizeToday, startOfCalendar, toApiDate } from "../lib/utils";
import { MonthNav } from "./MonthNav";

type AppView = "list" | "calendar";
type SortField = "registration_date" | "registration_time" | "fio" | "created_at";
type SortDir = "asc" | "desc";

export function ApplicationsTab({
  token,
  onAuthError,
}: {
  token: string;
  onAuthError: () => void;
}) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AppView>("list");
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [calDate, setCalDate] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("registration_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getApplications(token)
      .then((d) => {
        if (active) setApplications(d);
      })
      .catch((e) => {
        if (e.message === "Нет доступа" || e.message?.includes("401"))
          onAuthError();
        else toast.error(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, onAuthError]);

  const filtered = applications.filter((item) => {
    const q = search.toLowerCase();
    return [
      item.fio,
      item.phone,
      item.email,
      item.registration_date,
      item.registration_time,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "registration_date") {
        cmp = a.registration_date.localeCompare(b.registration_date);
        if (cmp === 0) cmp = a.registration_time.localeCompare(b.registration_time);
      } else if (sortField === "registration_time") {
        cmp = a.registration_time.localeCompare(b.registration_time);
        if (cmp === 0) cmp = a.registration_date.localeCompare(b.registration_date);
      } else if (sortField === "fio") {
        cmp = a.fio.localeCompare(b.fio, "ru");
      } else if (sortField === "created_at") {
        cmp = a.created_at.localeCompare(b.created_at);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const byDate = useMemo(() => {
    const map: Record<string, Application[]> = {};
    for (const app of applications) {
      if (!map[app.registration_date]) map[app.registration_date] = [];
      map[app.registration_date].push(app);
    }
    return map;
  }, [applications]);

  const exportCsv = () => {
    const header = ["ID", "ФИО", "Телефон", "Email", "Дата", "Время", "Создано"];
    const rows = sorted.map((item) => [
      item.id,
      item.fio,
      item.phone,
      item.email,
      item.registration_date,
      item.registration_time,
      item.created_at,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "applications.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = BLUE;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e5e7eb";
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Всего записей: {applications.length}
        </p>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition"
              style={{
                background: view === "list" ? BLUE : "#fff",
                color: view === "list" ? "#fff" : "#555",
              }}
            >
              <LayoutList className="h-4 w-4" /> Список
            </button>
            <button
              onClick={() => setView("calendar")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition"
              style={{
                background: view === "calendar" ? BLUE : "#fff",
                color: view === "calendar" ? "#fff" : "#555",
              }}
            >
              <CalendarDays className="h-4 w-4" /> По дате
            </button>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            onClick={exportCsv}
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div>
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3 outline-none"
              placeholder="Поиск по ФИО, телефону, email или дате"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead style={{ background: BLUE, color: "#fff" }}>
                <tr>
                  <SortTh label="ФИО" field="fio" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Контакты</th>
                  <SortTh label="Дата" field="registration_date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Время" field="registration_time" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Создано" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Загружаем заявки...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Заявок не найдено
                    </td>
                  </tr>
                ) : (
                  sorted.map((item) => (
                    <tr
                      key={item.id}
                      style={{ cursor: "default" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = BLUE_LIGHT;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "";
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">{item.fio}</div>
                        <div className="text-xs text-gray-400">ID {item.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{item.phone}</div>
                        <div className="text-xs text-gray-500">{item.email}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDisplayDate(item.registration_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded px-2 py-1 font-semibold text-white text-xs"
                          style={{ background: BLUE }}
                        >
                          {item.registration_time}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Intl.DateTimeFormat("ru-RU", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <CalendarAppView
          byDate={byDate}
          loading={loading}
          month={calMonth}
          onMonthChange={setCalMonth}
          selectedDate={calDate}
          onDateSelect={setCalDate}
        />
      )}
    </div>
  );
}

function SortTh({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = field === sortField;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className="px-4 py-3 font-semibold text-xs uppercase cursor-pointer select-none"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className="h-3.5 w-3.5" style={{ opacity: active ? 1 : 0.45 }} />
      </span>
    </th>
  );
}

function CalendarAppView({
  byDate,
  loading,
  month,
  onMonthChange,
  selectedDate,
  onDateSelect,
}: {
  byDate: Record<string, Application[]>;
  loading: boolean;
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDate: string | null;
  onDateSelect: (d: string | null) => void;
}) {
  const today = normalizeToday();
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

  const dateApps = selectedDate ? (byDate[selectedDate] ?? []) : [];
  const byTime = useMemo(() => {
    const map: Record<string, Application[]> = {};
    for (const app of dateApps) {
      if (!map[app.registration_time]) map[app.registration_time] = [];
      map[app.registration_time].push(app);
    }
    return map;
  }, [dateApps]);

  if (loading)
    return (
      <div className="py-8 text-center text-gray-400">Загружаем заявки...</div>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold capitalize" style={{ color: BLUE }}>
            {title}
          </h2>
          <MonthNav month={month} onMonthChange={onMonthChange} />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Нажмите на дату, чтобы увидеть записи на этот день.
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
            const count = byDate[apiDate]?.length ?? 0;
            const isSelected = apiDate === selectedDate;
            const isToday = isSameDate(day, today);

            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const hasApps = count > 0 && !outOfMonth;
            const unavailable = outOfMonth || (isWeekend && !hasApps);

            const bgBase = outOfMonth
              ? "transparent"
              : hasApps
              ? "#bfdbfe"
              : isWeekend
              ? "#f3f4f6"
              : "#fff";

            const bgHover = unavailable ? bgBase : "#eff6ff";

            return (
              <button
                key={day.toISOString()}
                disabled={outOfMonth}
                onClick={() => !unavailable ? onDateSelect(isSelected ? null : apiDate) : undefined}
                className="aspect-square rounded-xl flex items-center justify-center border border-gray-200"
                style={{
                  background: isSelected ? "#bfdbfe" : bgBase,
                  cursor: unavailable ? "default" : "pointer",
                  color: outOfMonth ? "transparent" : isWeekend && !hasApps ? "#bbb" : "inherit",
                  borderColor: outOfMonth
                    ? "transparent"
                    : hasApps || isSelected
                    ? "#93c5fd"
                    : isWeekend
                    ? "#e5e7eb"
                    : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!unavailable) e.currentTarget.style.background = bgHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? "#bfdbfe" : bgBase;
                }}
              >
                <span
                  className="inline-grid h-9 w-9 place-items-center rounded-full text-base font-semibold"
                  style={
                    isToday && !hasApps && !isSelected
                      ? { background: BLUE, color: "#fff" }
                      : {}
                  }
                >
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#fff", border: "1px solid #e5e7eb" }} />
            Без записей
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#bfdbfe", border: "1px solid #93c5fd" }} />
            Есть записи
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }} />
            Запись невозможна
          </span>
        </div>
      </div>

      <div>
        {selectedDate ? (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-lg text-gray-800">
                {formatDisplayDate(selectedDate)}
              </h3>
              <p className="text-sm text-gray-500">
                Всего записей: {dateApps.length}
              </p>
            </div>
            {dateApps.length === 0 ? (
              <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-400">
                На этот день записей нет.
              </div>
            ) : (
              <div className="space-y-3">
                {TIME_SLOTS.filter((t) => byTime[t]?.length).map((time) => (
                  <div
                    key={time}
                    className="rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-2"
                      style={{ background: BLUE }}
                    >
                      <Clock className="h-4 w-4 text-white opacity-80" />
                      <span className="font-bold text-white">{time}</span>
                      <span className="ml-auto text-xs text-white opacity-70">
                        {byTime[time].length} чел.
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {byTime[time].map((app) => (
                        <div key={app.id} className="px-4 py-3">
                          <div className="font-medium text-sm">{app.fio}</div>
                          <div className="flex gap-4 mt-1 text-xs text-gray-500">
                            <span>{app.phone}</span>
                            <span>{app.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
            <CalendarDays className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              Выберите дату в календаре
              <br />
              чтобы увидеть записи
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

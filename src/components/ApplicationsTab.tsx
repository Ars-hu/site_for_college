import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LayoutList,
  Search,
  Trash2,
} from "lucide-react";
import {
  type Application,
  type ApplicationsParams,
  type ApplicationsPage,
  type AllowedMonth,
  deleteApplication,
  exportApplicationsExcel,
  getClock,
  getAdminAllowedMonths,
  getApplications,
  updateApplicationStatus,
} from "../lib/api";
import { BLUE, BLUE_LIGHT, TIME_SLOTS, WEEK_DAYS } from "../lib/constants";
import {
  formatDisplayDate,
  isSameDate,
  normalizeToday,
  startOfCalendar,
  toApiDate,
} from "../lib/utils";
import { MonthNav } from "./ui/MonthNav";

type AppView = "list" | "calendar";
type SortField = ApplicationsParams["sort"] & string;
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

// ─── Main component ──────────────────────────────────────────────────────────

export function ApplicationsTab({
  token,
  onAuthError,
}: {
  token: string;
  onAuthError: () => void;
}) {
  const [view, setView] = useState<AppView>("list");

  // List state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("registration_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [data, setData] = useState<ApplicationsPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendar state — uses a separate full-list fetch
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [calDate, setCalDate] = useState<string | null>(null);
  const [allApps, setAllApps] = useState<Application[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [allowedMonths, setAllowedMonths] = useState<AllowedMonth[]>([]);

  const [serverToday, setServerToday] = useState<Date | null>(null);
  const today = serverToday ?? normalizeToday();
  const stableOnAuthError = useRef(onAuthError);
  useEffect(() => { stableOnAuthError.current = onAuthError; }, [onAuthError]);

  useEffect(() => {
    getClock(token)
      .then((info) => {
        const [y, m, d] = info.effective_now.split("T")[0].split("-").map(Number);
        setServerToday(new Date(y, m - 1, d, 0, 0, 0, 0));
      })
      .catch(() => {});
  }, [token]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  };

  // Fetch paginated list
  useEffect(() => {
    if (view !== "list") return;
    let active = true;
    setLoading(true);
    getApplications(token, {
      page,
      page_size: pageSize,
      search: debouncedSearch || undefined,
      sort: sortField as ApplicationsParams["sort"],
      order: sortDir,
    })
      .then((d) => { if (active) setData(d); })
      .catch((e) => {
        if (!active) return;
        if (e.message === "Нет доступа" || e.message?.includes("401")) stableOnAuthError.current();
        else toast.error(e.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, view, page, pageSize, debouncedSearch, sortField, sortDir]);

  // Fetch all apps for calendar (no pagination)
  useEffect(() => {
    if (view !== "calendar") return;
    let active = true;
    setCalLoading(true);
    Promise.all([
      getApplications(token, { page: 1, page_size: 10000 }),
      getAdminAllowedMonths(token),
    ])
      .then(([appsData, months]) => {
        if (active) {
          setAllApps(appsData.items);
          setAllowedMonths(months);
        }
      })
      .catch((e) => {
        if (!active) return;
        if (e.message === "Нет доступа" || e.message?.includes("401")) stableOnAuthError.current();
        else toast.error(e.message);
      })
      .finally(() => { if (active) setCalLoading(false); });
    return () => { active = false; };
  }, [token, view]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleDelete = async (id: number, fio: string) => {
    try {
      await deleteApplication(token, id);
      toast.success("Запись удалена");
      // Refetch: trigger by bumping page or resetting state
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((a) => a.id !== id),
              total: prev.total - 1,
            }
          : prev
      );
      setAllApps((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleStatus = async (
    id: number,
    status: "confirmed" | "rejected"
  ) => {
    try {
      await updateApplicationStatus(token, id, status);
      const label = status === "confirmed" ? "подтверждена" : "отклонена";
      toast.success(`Запись ${label}`);
      const patch = (a: Application): Application =>
        a.id === id ? { ...a, status } : a;
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map(patch) } : prev
      );
      setAllApps((prev) => prev.map(patch));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const byDate = useMemo(() => {
    const map: Record<string, Application[]> = {};
    for (const app of allApps) {
      if (!map[app.registration_date]) map[app.registration_date] = [];
      map[app.registration_date].push(app);
    }
    return map;
  }, [allApps]);

  const exportExcel = async (filterDate?: string) => {
    try {
      await exportApplicationsExcel(token, filterDate);
      toast.success(filterDate ? `Выгружен день ${filterDate}` : "Excel файл скачан");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = BLUE; };
  const blurStyle  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#e5e7eb"; };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Всего записей: {view === "list" ? total : allApps.length}
        </p>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition"
              style={{ background: view === "list" ? BLUE : "#fff", color: view === "list" ? "#fff" : "#555" }}
            >
              <LayoutList className="h-4 w-4" /> Список
            </button>
            <button
              onClick={() => setView("calendar")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition"
              style={{ background: view === "calendar" ? BLUE : "#fff", color: view === "calendar" ? "#fff" : "#555" }}
            >
              <CalendarDays className="h-4 w-4" /> По дате
            </button>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            onClick={() => exportExcel()}
          >
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div>
          {/* Search */}
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3 outline-none"
              placeholder="Поиск по ФИО, телефону, email или дате"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead style={{ background: BLUE, color: "#fff" }}>
                <tr>
                  <SortTh label="ФИО"     field="fio"               sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Контакты</th>
                  <SortTh label="Дата"    field="registration_date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Время"   field="registration_time" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Создано" field="created_at"        sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 font-semibold text-xs uppercase text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Загружаем заявки...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Заявок не найдено</td></tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      style={{ cursor: "default" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = BLUE_LIGHT; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">{item.fio}</div>
                        <div className="text-xs text-gray-400">ID {item.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{item.phone}</div>
                        <div className="text-xs text-gray-500">{item.email}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDisplayDate(item.registration_date)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded px-2 py-1 font-semibold text-white text-xs" style={{ background: BLUE }}>
                          {item.registration_time}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {item.created_at
                          ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1.5">
                          <StatusBadge status={item.status} />
                          <div className="flex gap-1">
                            <ActionBtn
                              title="Принять"
                              color="#16a34a"
                              hoverColor="#15803d"
                              active={item.status !== "confirmed"}
                              onClick={() => handleStatus(item.id, item.status === "confirmed" ? "pending" : "confirmed")}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </ActionBtn>
                            <ActionBtn
                              title="Отклонить и удалить"
                              color="#ef4444"
                              hoverColor="#dc2626"
                              onClick={() => handleDelete(item.id, item.fio)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ActionBtn>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={total}
              from={(page - 1) * pageSize + 1}
              to={Math.min(page * pageSize, total)}
              onPage={setPage}
              onPageSize={(ps) => { setPageSize(ps); setPage(1); }}
            />
          )}
        </div>
      ) : (
        <CalendarAppView
          byDate={byDate}
          loading={calLoading}
          month={calMonth}
          onMonthChange={setCalMonth}
          selectedDate={calDate}
          onDateSelect={setCalDate}
          allowedMonths={allowedMonths}
          onExportDay={exportExcel}
          today={today}
        />
      )}
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, pageSize, totalItems, from, to, onPage, onPageSize,
}: {
  page: number; totalPages: number; pageSize: number; totalItems: number;
  from: number; to: number;
  onPage: (p: number) => void; onPageSize: (ps: number) => void;
}) {
  const pages = buildPageRange(page, totalPages);
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500 order-2 sm:order-1">
        Показаны <span className="font-medium text-gray-700">{from}–{to}</span> из{" "}
        <span className="font-medium text-gray-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <PageBtn onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Предыдущая">
          <ChevronLeft className="h-4 w-4" />
        </PageBtn>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-gray-400 select-none">…</span>
          ) : (
            <PageBtn key={p} active={p === page} onClick={() => onPage(p as number)}>{p}</PageBtn>
          )
        )}
        <PageBtn onClick={() => onPage(page + 1)} disabled={page === totalPages} aria-label="Следующая">
          <ChevronRight className="h-4 w-4" />
        </PageBtn>
      </div>
      <div className="flex items-center gap-2 order-3 text-sm text-gray-500">
        <span>Строк:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none cursor-pointer"
          style={{ color: "#374151" }}
        >
          {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

function PageBtn({ children, onClick, disabled, active, "aria-label": al }: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; active?: boolean; "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} aria-label={al}
      className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-sm font-medium transition"
      style={{
        background: active ? BLUE : disabled ? "#f9fafb" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
        borderColor: active ? BLUE : "#e5e7eb",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const result: (number | "…")[] = [];
  const add = (n: number | "…") => { if (result[result.length - 1] !== n) result.push(n); };
  add(1);
  if (current > 3) add("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p);
  if (current < total - 2) add("…");
  add(total);
  return result;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "Ожидает",     bg: "#fef9c3", color: "#854d0e" },
  confirmed: { label: "Подтверждена", bg: "#dcfce7", color: "#166534" },
  rejected:  { label: "Отклонена",   bg: "#fee2e2", color: "#991b1b" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── ActionBtn ───────────────────────────────────────────────────────────────

function ActionBtn({
  children, title, color, hoverColor, active, onClick,
}: {
  children: React.ReactNode;
  title: string;
  color: string;
  hoverColor: string;
  active?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white transition"
      style={{
        background: hovered ? hoverColor : color,
        opacity: active === false ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SortTh({ label, field, sortField, sortDir, onSort }: {
  label: string; field: SortField; sortField: SortField; sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = field === sortField;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-4 py-3 font-semibold text-xs uppercase cursor-pointer select-none" onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className="h-3.5 w-3.5" style={{ opacity: active ? 1 : 0.45 }} />
      </span>
    </th>
  );
}

// ─── Calendar view ────────────────────────────────────────────────────────────

function CalendarAppView({ byDate, loading, month, onMonthChange, selectedDate, onDateSelect, allowedMonths, onExportDay, today }: {
  byDate: Record<string, Application[]>; loading: boolean; month: Date;
  onMonthChange: (d: Date) => void; selectedDate: string | null; onDateSelect: (d: string | null) => void;
  allowedMonths: AllowedMonth[];
  onExportDay: (date: string) => void;
  today: Date;
}) {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const allowedSet = useMemo(
    () => new Set(allowedMonths.map((m) => `${m.year}-${m.month}`)),
    [allowedMonths]
  );

  const isMonthAllowed = (d: Date) => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const isPast = y < currentYear || (y === currentYear && m < currentMonth);
    if (isPast) return false;
    return allowedSet.has(`${y}-${m}`);
  };

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
  const handlePrev = () => { if (prevAllowed) onMonthChange(prevAllowed); };
  const handleNext = () => { if (nextAllowed) onMonthChange(nextAllowed); };

  // Snap to first allowed month if current is not allowed
  useEffect(() => {
    if (allowedMonths.length === 0) return;
    if (!isMonthAllowed(month)) {
      const future = allowedMonths
        .filter((m) => !(m.year < currentYear || (m.year === currentYear && m.month < currentMonth)))
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
      if (future.length > 0) onMonthChange(new Date(future[0].year, future[0].month - 1, 1));
    }
  }, [allowedMonths]);

  const days = useMemo(() => {
    const start = startOfCalendar(month);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [month]);
  const title = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(month);
  const dateApps = selectedDate ? (byDate[selectedDate] ?? []) : [];
  const byTime = useMemo(() => {
    const map: Record<string, Application[]> = {};
    for (const app of dateApps) {
      if (!map[app.registration_time]) map[app.registration_time] = [];
      map[app.registration_time].push(app);
    }
    return map;
  }, [dateApps]);

  if (loading) return <div className="py-8 text-center text-gray-400">Загружаем заявки...</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold capitalize" style={{ color: BLUE }}>{title}</h2>
          <MonthNav month={month} onMonthChange={onMonthChange} canGoBack={canGoBack} canGoForward={canGoForward} onPrev={handlePrev} onNext={handleNext} />
        </div>
        <p className="text-xs text-gray-400 mb-3">Нажмите на дату, чтобы увидеть записи на этот день.</p>
        <div className="grid grid-cols-7 pb-2 text-center text-xs font-semibold uppercase text-gray-400 border-b border-gray-200">
          {WEEK_DAYS.map((d) => <div key={d}>{d}</div>)}
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
            const isAllowed = isMonthAllowed(month);
            const unavailable = outOfMonth || !isAllowed || (isWeekend && !hasApps);
            const bgBase = outOfMonth ? "transparent" : hasApps ? "#bfdbfe" : isWeekend ? "#f3f4f6" : "#fff";
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
                  borderColor: outOfMonth ? "transparent" : hasApps || isSelected ? "#93c5fd" : isWeekend ? "#e5e7eb" : undefined,
                }}
                onMouseEnter={(e) => { if (!unavailable) e.currentTarget.style.background = bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "#bfdbfe" : bgBase; }}
              >
                <span
                  className="inline-grid h-9 w-9 place-items-center rounded-full text-base font-semibold"
                  style={isToday && !hasApps && !isSelected ? { background: BLUE, color: "#fff" } : {}}
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
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold text-lg text-gray-800">{formatDisplayDate(selectedDate)}</h3>
                <button
                  onClick={() => onExportDay(selectedDate)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  title="Выгрузить записи этого дня в Excel"
                >
                  <Download className="h-3.5 w-3.5" /> Excel
                </button>
              </div>
              <p className="text-sm text-gray-500">Всего записей: {dateApps.length}</p>
            </div>
            {dateApps.length === 0 ? (
              <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-400">На этот день записей нет.</div>
            ) : (
              <div className="space-y-3">
                {TIME_SLOTS.filter((t) => byTime[t]?.length).map((time) => (
                  <div key={time} className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2" style={{ background: BLUE }}>
                      <Clock className="h-4 w-4 text-white opacity-80" />
                      <span className="font-bold text-white">{time}</span>
                      <span className="ml-auto text-xs text-white opacity-70">{byTime[time].length} чел.</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {byTime[time].map((app) => (
                        <div key={app.id} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm">{app.fio}</div>
                            <StatusBadge status={app.status} />
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-gray-500">
                            <span>{app.phone}</span><span>{app.email}</span>
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
            <p className="text-sm">Выберите дату в календаре<br />чтобы увидеть записи</p>
          </div>
        )}
      </div>
    </div>
  );
}
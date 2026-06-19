import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import {
  type ArchivedApplication,
  type ArchivePage,
  type ApplicationsParams,
  getArchive,
  runArchive,
} from "../lib/api";
import { BLUE, BLUE_LIGHT } from "../lib/constants";
import { formatDisplayDate } from "../lib/utils";

type SortField = "fio" | "registration_date" | "registration_time" | "archived_at";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "Ожидал",       bg: "#fef9c3", color: "#854d0e" },
  confirmed: { label: "Подтверждён",  bg: "#dcfce7", color: "#166534" },
  rejected:  { label: "Отклонён",     bg: "#fee2e2", color: "#991b1b" },
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

export function ArchiveTab({
  token,
  onAuthError,
}: {
  token: string;
  onAuthError: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("registration_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [data, setData] = useState<ArchivePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const stableOnAuthError = useRef(onAuthError);
  useEffect(() => { stableOnAuthError.current = onAuthError; }, [onAuthError]);

  // Автоматически переносим просроченные записи при открытии вкладки
  useEffect(() => {
    runArchive(token)
      .then((res) => { if (res.archived > 0) setReloadKey((k) => k + 1); })
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

  useEffect(() => {
    let active = true;
    setLoading(true);
    getArchive(token, {
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
  }, [token, page, pageSize, debouncedSearch, sortField, sortDir, reloadKey]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const exportXlsx = async () => {
    try {
      const all = await getArchive(token, {
        page: 1,
        page_size: 10000,
        search: debouncedSearch || undefined,
        sort: sortField as ApplicationsParams["sort"],
        order: sortDir,
      });
      const header = ["ID", "ФИО", "Телефон", "Email", "Дата", "Время", "В архив", "Статус"];
      const statusLabels: Record<string, string> = {
        pending: "Ожидал", confirmed: "Подтверждён", rejected: "Отклонён",
      };
      const rows = all.items.map((item) => [
        item.original_id, item.fio, item.phone, item.email,
        item.registration_date, item.registration_time,
        new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.archived_at ?? item.created_at)),
        statusLabels[item.status] ?? item.status,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Архив");
      XLSX.writeFile(wb, "archive.xlsx");
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
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">Всего в архиве: {total}</p>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          onClick={exportXlsx}
        >
          <Download className="h-4 w-4" /> Excel
        </button>
      </div>

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

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead style={{ background: "#6b7280", color: "#fff" }}>
            <tr>
              <SortTh label="ФИО"            field="fio"               sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 font-semibold text-xs uppercase">Контакты</th>
              <SortTh label="Дата"           field="registration_date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="Время"          field="registration_time" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="В архив"        field="archived_at"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-3 font-semibold text-xs uppercase">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Загружаем архив...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Архив пуст</td></tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = BLUE_LIGHT; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                >
                  <td className="px-3 py-3">
                    <div className="font-semibold text-sm">{item.fio}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm">{item.phone}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[160px]">{item.email}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">{formatDisplayDate(item.registration_date)}</td>
                  <td className="px-3 py-3">
                    <span className="rounded px-2 py-1 font-semibold text-white text-xs" style={{ background: "#6b7280" }}>
                      {item.registration_time}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-sm">
                    {item.archived_at
                      ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.archived_at))
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
        background: active ? "#6b7280" : disabled ? "#f9fafb" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
        borderColor: active ? "#6b7280" : "#e5e7eb",
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
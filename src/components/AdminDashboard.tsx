import { useState, type ReactNode } from "react";
import { CalendarDays, FileText, LogOut, Settings } from "lucide-react";
import { BLUE, BLUE_DARK } from "../lib/constants";
import { ApplicationsTab } from "./ApplicationsTab";
import { ScheduleTab } from "./ScheduleTab";
import { MonthsTab } from "./MonthsTab";

type AdminTab = "applications" | "schedule" | "months";

export function AdminDashboard({
  token,
  onLogout,
  onAuthError,
}: {
  token: string;
  onLogout: () => void;
  onAuthError: () => void;
}) {
  const [tab, setTab] = useState<AdminTab>("applications");

  const TABS: { id: AdminTab; label: string; icon: ReactNode }[] = [
    { id: "applications", label: "Заявки", icon: <FileText className="h-4 w-4" /> },
    { id: "schedule", label: "Расписание", icon: <Settings className="h-4 w-4" /> },
    { id: "months", label: "Месяцы", icon: <CalendarDays className="h-4 w-4" /> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold" style={{ color: BLUE }}>
          Панель администратора
        </h1>
        <button
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: BLUE }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = BLUE_DARK;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = BLUE;
          }}
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" /> Выйти
        </button>
      </div>

      <div className="flex border-b border-gray-200 px-5">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition"
            style={{
              borderBottomColor: tab === id ? BLUE : "transparent",
              color: tab === id ? BLUE : "#666",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "applications" && (
          <ApplicationsTab token={token} onAuthError={onAuthError} />
        )}
        {tab === "schedule" && (
          <ScheduleTab token={token} onAuthError={onAuthError} />
        )}
        {tab === "months" && (
          <MonthsTab token={token} onAuthError={onAuthError} />
        )}
      </div>
    </div>
  );
}

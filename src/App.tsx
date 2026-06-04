import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Toaster, toast } from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  LogIn,
  LogOut,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  Application,
  getApplications,
  getSlotsStatus,
  loginAdmin,
  registerApplication,
} from "./lib/api";

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
];

const DOCUMENTS = [
  "Паспорт абитуриента и копии страниц с личными данными",
  "Документ об образовании: аттестат или диплом",
  "СНИЛС",
  "Медицинский полис",
  "4 фотографии 3x4",
  "Согласие на обработку персональных данных",
  "Справка о результатах ГИА, если требуется",
];

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type Step = "date" | "time" | "form";

type FormData = {
  fio: string;
  phone: string;
  email: string;
};

function toApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(`${date}T00:00:00`) : date);
}

function startOfCalendar(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function App() {
  const [mode, setMode] = useState<"registration" | "admin">("registration");
  const [step, setStep] = useState<Step>("date");
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const resetRegistration = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setStep("date");
  };

  const pickDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep("time");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button
            className="flex min-w-0 items-center gap-3 text-left"
            onClick={() => {
              setMode("registration");
              resetRegistration();
            }}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-sm font-bold text-white">
              КК
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold sm:text-base">
                Тверской колледж им. А. Н. Коняева
              </span>
              <span className="block truncate text-xs text-slate-500">
                Предварительная запись в приемную комиссию
              </span>
            </span>
          </button>

          <nav className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "registration"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
              onClick={() => setMode("registration")}
            >
              Запись
            </button>
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "admin"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
              onClick={() => setMode("admin")}
            >
              Админ
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          {mode === "registration" ? (
            <RegistrationFlow
              step={step}
              month={month}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onMonthChange={setMonth}
              onDateSelect={pickDate}
              onTimeSelect={(time) => {
                setSelectedTime(time);
                setStep("form");
              }}
              onBack={() => {
                if (step === "form") {
                  setStep("time");
                  setSelectedTime(null);
                } else {
                  resetRegistration();
                }
              }}
              onSuccess={resetRegistration}
            />
          ) : (
            <AdminPanel />
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-700" />
              <h2 className="text-base font-semibold">Документы</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              {DOCUMENTS.map((doc, index) => (
                <li className="flex gap-3" key={doc}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-cyan-50 text-xs font-bold text-cyan-800">
                    {index + 1}
                  </span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-700" />
              <h2 className="text-base font-semibold">Как это работает</h2>
            </div>
            <ol className="space-y-2 text-sm text-slate-600">
              <li>1. Выберите доступную дату.</li>
              <li>2. Забронируйте удобное время.</li>
              <li>3. Укажите ФИО и контакты.</li>
            </ol>
          </div>
        </aside>
      </main>

      <Toaster position="bottom-right" />
    </div>
  );
}

type RegistrationFlowProps = {
  step: Step;
  month: Date;
  selectedDate: Date | null;
  selectedTime: string | null;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  onBack: () => void;
  onSuccess: () => void;
};

function RegistrationFlow({
  step,
  month,
  selectedDate,
  selectedTime,
  onMonthChange,
  onDateSelect,
  onTimeSelect,
  onBack,
  onSuccess,
}: RegistrationFlowProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <p className="text-sm font-medium text-cyan-800">Приемная комиссия</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
          Запись на подачу документов
        </h1>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <StepBadge active={step === "date"} done={step !== "date"} text="Дата" />
          <StepBadge active={step === "time"} done={step === "form"} text="Время" />
          <StepBadge active={step === "form"} done={false} text="Контакты" />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {step === "date" && (
          <CalendarView
            month={month}
            onMonthChange={onMonthChange}
            onDateSelect={onDateSelect}
          />
        )}

        {step === "time" && selectedDate && (
          <TimePicker
            selectedDate={selectedDate}
            onBack={onBack}
            onTimeSelect={onTimeSelect}
          />
        )}

        {step === "form" && selectedDate && selectedTime && (
          <RegistrationForm
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onBack={onBack}
            onSuccess={onSuccess}
          />
        )}
      </div>
    </div>
  );
}

function StepBadge({
  active,
  done,
  text,
}: {
  active: boolean;
  done: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
        active
          ? "border-cyan-300 bg-cyan-50 text-cyan-900"
          : done
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
      {text}
    </div>
  );
}

function CalendarView({
  month,
  onMonthChange,
  onDateSelect,
}: {
  month: Date;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
}) {
  const today = normalizeToday();
  const days = useMemo(() => {
    const start = startOfCalendar(month);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);

  const title = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(month);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold capitalize">{title}</h2>
          <p className="text-sm text-slate-500">Доступны даты начиная с сегодняшнего дня.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            title="Предыдущий месяц"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            title="Следующий месяц"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-xs font-semibold uppercase text-slate-400">
        {WEEK_DAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200">
        {days.map((day) => {
          const disabled = day < today || day.getMonth() !== month.getMonth();
          const isToday = isSameDate(day, today);

          return (
            <button
              key={day.toISOString()}
              className={`min-h-20 border-b border-r border-slate-200 p-2 text-left transition ${
                disabled
                  ? "cursor-not-allowed bg-slate-50 text-slate-300"
                  : "bg-white hover:bg-cyan-50"
              }`}
              disabled={disabled}
              onClick={() => onDateSelect(day)}
            >
              <span
                className={`inline-grid h-7 w-7 place-items-center rounded-md text-sm font-semibold ${
                  isToday ? "bg-slate-950 text-white" : ""
                }`}
              >
                {day.getDate()}
              </span>
              {!disabled && (
                <span className="mt-2 block text-xs font-medium text-emerald-700">
                  Есть места
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({
  selectedDate,
  onBack,
  onTimeSelect,
}: {
  selectedDate: Date;
  onBack: () => void;
  onTimeSelect: (time: string) => void;
}) {
  const [slots, setSlots] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSlotsStatus(toApiDate(selectedDate))
      .then((data) => {
        if (active) setSlots(data);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDate]);

  return (
    <div>
      <button className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-800" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Выбрать другую дату
      </button>

      <div className="mb-5 flex items-center gap-3 rounded-lg bg-slate-50 p-4">
        <CalendarDays className="h-5 w-5 text-cyan-700" />
        <div>
          <h2 className="font-semibold">{formatDisplayDate(selectedDate)}</h2>
          <p className="text-sm text-slate-500">В каждом временном слоте доступно до 3 записей.</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 p-8 text-center text-slate-500">
          Загружаем свободные места...
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {TIME_SLOTS.map((time) => {
            const busy = slots[time] ?? 0;
            const available = Math.max(0, 3 - busy);
            const disabled = available === 0;

            return (
              <button
                key={time}
                className={`flex items-center justify-between rounded-lg border p-4 text-left transition ${
                  disabled
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50"
                }`}
                disabled={disabled}
                onClick={() => onTimeSelect(time)}
              >
                <span>
                  <span className="block text-lg font-bold">{time}</span>
                  <span className="text-sm">{disabled ? "Мест нет" : `Свободно: ${available}`}</span>
                </span>
                <Clock className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RegistrationForm({
  selectedDate,
  selectedTime,
  onBack,
  onSuccess,
}: {
  selectedDate: Date;
  selectedTime: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormData>({ fio: "", phone: "", email: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      await registerApplication({
        ...form,
        registration_date: toApiDate(selectedDate),
        registration_time: selectedTime,
      });
      toast.success("Вы успешно записаны");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-800" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Вернуться ко времени
      </button>

      <div className="mb-5 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
        <div className="text-sm text-cyan-800">Выбранная запись</div>
        <div className="mt-1 text-lg font-semibold">
          {formatDisplayDate(selectedDate)}, {selectedTime}
        </div>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium">ФИО абитуриента</span>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              minLength={5}
              required
              value={form.fio}
              onChange={(event) => setForm({ ...form, fio: event.target.value })}
              placeholder="Иванов Иван Иванович"
            />
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Телефон</span>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                required
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="+7 900 000-00-00"
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="name@example.ru"
              />
            </div>
          </label>
        </div>

        <button
          className="mt-2 rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Отправляем..." : "Записаться"}
        </button>
      </form>
    </div>
  );
}

function AdminPanel() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") ?? "");

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {token ? (
        <AdminDashboard
          token={token}
          onLogout={() => {
            localStorage.removeItem("admin_token");
            setToken("");
            toast.success("Вы вышли из админ-панели");
          }}
        />
      ) : (
        <AdminLogin
          onLogin={(nextToken) => {
            localStorage.setItem("admin_token", nextToken);
            setToken(nextToken);
            toast.success("Вход выполнен");
          }}
        />
      )}
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await loginAdmin(username, password);
      onLogin(response.token);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-5 sm:p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-slate-100">
          <ShieldCheck className="h-7 w-7 text-slate-700" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Админ-панель</h1>
        <p className="mt-1 text-sm text-slate-500">Управление заявками приемной комиссии</p>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Логин</span>
          <input
            className="rounded-lg border border-slate-200 px-3 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium">Пароль</span>
          <input
            className="rounded-lg border border-slate-200 px-3 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          <LogIn className="h-5 w-5" />
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>
    </div>
  );
}

function AdminDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getApplications(token)
      .then((data) => {
        if (active) setApplications(data);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const filtered = applications.filter((item) => {
    const query = search.toLowerCase();
    return [item.fio, item.phone, item.email, item.registration_date, item.registration_time]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const exportCsv = () => {
    const header = ["ID", "ФИО", "Телефон", "Email", "Дата", "Время", "Создано"];
    const rows = filtered.map((item) => [
      item.id,
      item.fio,
      item.phone,
      item.email,
      item.registration_date,
      item.registration_time,
      item.created_at,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">Заявки</h1>
          <p className="text-sm text-slate-500">Всего записей: {applications.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            onClick={exportCsv}
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            placeholder="Поиск по ФИО, телефону, email или дате"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">ФИО</th>
                <th className="px-4 py-3 font-semibold">Контакты</th>
                <th className="px-4 py-3 font-semibold">Дата</th>
                <th className="px-4 py-3 font-semibold">Время</th>
                <th className="px-4 py-3 font-semibold">Создано</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Загружаем заявки...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Заявок не найдено
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950">{item.fio}</div>
                      <div className="text-xs text-slate-400">ID {item.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{item.phone}</div>
                      <div className="text-xs text-slate-500">{item.email}</div>
                    </td>
                    <td className="px-4 py-3">{formatDisplayDate(item.registration_date)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">
                        {item.registration_time}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
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
    </div>
  );
}

export default App;

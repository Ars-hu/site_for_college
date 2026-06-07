import { useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { CalendarDays, Clock, FileText, Phone } from "lucide-react";
import { getDatesStatus, getAllowedMonths } from "./lib/api";
import type { AllowedMonth } from "./lib/api";
import { BLUE, DOCUMENTS } from "./lib/constants";
import { Card } from "./components/Card";
import { RegistrationFlow } from "./components/RegistrationFlow";
import { AdminPanel } from "./components/AdminPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";

type Step = "date" | "time" | "form";

export default function App() {
  const [mode, setMode] = useState<"registration" | "admin">("registration");
  const [step, setStep] = useState<Step>("date");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [fullDates, setFullDates] = useState<string[]>([]);
  const [openedWeekends, setOpenedWeekends] = useState<string[]>([]);
  const [allowedMonths, setAllowedMonths] = useState<AllowedMonth[]>([]);
  const monthInitRef = useRef(false);

  /* Secret logo tap — 5 rapid clicks open admin */
  const logoTapsRef = useRef(0);
  const logoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLogoClick = () => {
    if (mode === "admin") {
      setMode("registration");
      resetRegistration();
      return;
    }
    logoTapsRef.current += 1;
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    if (logoTapsRef.current >= 5) {
      logoTapsRef.current = 0;
      setMode("admin");
    } else {
      logoTimerRef.current = setTimeout(() => {
        logoTapsRef.current = 0;
      }, 1200);
    }
  };

  useEffect(() => {
    getDatesStatus()
      .then((d) => {
        setBlockedDates(d.blocked_dates);
        setFullDates(d.full_dates);
        setOpenedWeekends(d.opened_weekends);
      })
      .catch(() => {});

    getAllowedMonths()
      .then((months) => {
        setAllowedMonths(months);
        if (monthInitRef.current || months.length === 0) return;
        monthInitRef.current = true;
        const now = new Date();
        const key = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const allowed = new Set(months.map((m) => `${m.year}-${m.month}`));
        if (!allowed.has(key)) {
          const first = months[0];
          setMonth(new Date(first.year, first.month - 1, 1));
        }
      })
      .catch(() => {});
  }, []);

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
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <header
        style={{ background: "#fff", borderBottom: `3px solid ${BLUE}` }}
        className="shadow-sm sticky top-0 z-30"
      >
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 text-left select-none"
          >
            <img
              src="/123.jpg"
              alt="Логотип колледжа"
              className="flex-shrink-0 rounded-full"
              style={{ width: 52, height: 52, objectFit: "contain" }}
            />
            <div>
              <div
                className="font-bold text-base leading-tight"
                style={{ color: BLUE }}
              >
                Тверской колледж им. А.Н. Коняева
              </div>
              <div className="text-xs text-gray-500">
                Предварительная запись в приёмную комиссию
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Blue nav strip */}
      <div style={{ background: BLUE }} className="py-2 px-4">
        <div className="mx-auto max-w-6xl flex items-center gap-4 text-white text-sm">
          <span className="font-semibold uppercase tracking-wide">
            Приёмная комиссия
          </span>
          <span className="opacity-40">|</span>
          <span className="opacity-80">Запись на подачу документов</span>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl gap-6 px-4 py-6 grid lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          <ErrorBoundary>
          {mode === "registration" ? (
            <RegistrationFlow
              step={step}
              month={month}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              blockedDates={blockedDates}
              fullDates={fullDates}
              openedWeekends={openedWeekends}
              allowedMonths={allowedMonths}
              onMonthChange={setMonth}
              onDateSelect={pickDate}
              onTimeSelect={(t) => {
                setSelectedTime(t);
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
            <AdminPanel
              onClose={() => {
                setMode("registration");
                resetRegistration();
              }}
            />
          )}
          </ErrorBoundary>
        </section>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" style={{ color: BLUE }} />
              <h2 className="text-base font-semibold">Необходимые документы</h2>
            </div>
            <ul className="space-y-3 text-sm text-gray-600">
              {DOCUMENTS.map((doc, i) => (
                <li key={doc} className="flex gap-3">
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: BLUE }}
                  >
                    {i + 1}
                  </span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5" style={{ color: BLUE }} />
              <h2 className="text-base font-semibold">Как это работает</h2>
            </div>
            <ol className="space-y-2 text-sm text-gray-600">
              <li>1. Выберите доступную дату в календаре.</li>
              <li>2. Выберите удобное время записи.</li>
              <li>3. Укажите ФИО и контактные данные.</li>
            </ol>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-5 w-5" style={{ color: BLUE }} />
              <h2 className="text-base font-semibold">Контакты</h2>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>График работы приёмной комиссии:</div>
              <div>Понедельник — пятница: 9:00 до 15:00</div>
              <div className="mt-1">Тел.: 8-915-730-07-23</div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-5 w-5" style={{ color: BLUE }} />
              <h2 className="text-base font-semibold">Запись доступна</h2>
            </div>
            <div className="text-sm text-gray-600">
              Запись открыта с июня по август, только в рабочие дни
              (понедельник–пятница).
            </div>
          </Card>
        </aside>
      </main>

      {/* Footer */}
      <footer
        style={{ background: BLUE, color: "#fff" }}
        className="py-4 text-sm text-center"
      >
        © {new Date().getFullYear()} ГБПОУ «Тверской колледж им. А.Н. Коняева»
      </footer>

      <Toaster position="bottom-right" />
    </div>
  );
}

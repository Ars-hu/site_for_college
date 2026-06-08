import { useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { CalendarDays, ChevronRight, FileText, Phone, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getDatesStatus, getAllowedMonths } from "./lib/api";
import type { AllowedMonth } from "./lib/api";
import { BLUE } from "./lib/constants";
import { Card } from "./components/ui/Card";
import { RegistrationFlow } from "./components/RegistrationFlow";
import { AdminPanel } from "./components/AdminPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";

type Step = "date" | "time" | "form";

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname === "/admin";
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

  const loadDatesStatus = () => {
    getDatesStatus()
      .then((d) => {
        setBlockedDates(d.blocked_dates);
        setFullDates(d.full_dates);
        setOpenedWeekends(d.opened_weekends);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadDatesStatus();

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

  const [docsModal, setDocsModal] = useState<"9" | "11" | null>(null);

  const DOCS_9 = [
    "Копия паспорта (при себе иметь оригинал — ОБЯЗАТЕЛЬНО)",
    "Копия аттестата (при себе иметь оригинал — ОБЯЗАТЕЛЬНО)",
    "Справка о результатах ГИА по форме, утверждённой Министерством образования Тверской области",
    "Копия СНИЛС",
    "При наличии льгот — копии и оригиналы документов, подтверждающих право на льготы",
  ];

  const DOCS_11 = [
    "Копия паспорта (при себе иметь оригинал — ОБЯЗАТЕЛЬНО)",
    "Копия аттестата 9 классов + 11 классов (при себе иметь оригиналы — ОБЯЗАТЕЛЬНО)",
    "Копия СНИЛС",
    "При наличии льгот — копии и оригиналы документов, подтверждающих право на льготы",
  ];
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
          <div className="flex items-center gap-3 select-none">
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
          </div>
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
          {isAdmin ? (
            <AdminPanel
              onClose={() => {
                resetRegistration();
              }}
            />
          ) : (
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
              onSuccess={() => {
                loadDatesStatus();
                resetRegistration();
              }}
            />
          )}
          </ErrorBoundary>
        </section>

        <aside className="space-y-4">
          {/* Контакты — первым */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-5 w-5" style={{ color: BLUE }} />
              <h2 className="text-base font-semibold">Контакты</h2>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>График работы приёмной комиссии:</div>
              <div>Понедельник — пятница: 9:00 до 15:00</div>
              <div className="mt-1">Тел.: 8-915-730-07-23</div>
              <div>Адрес: г. Тверь, наб. реки Лазури, 1, корп. 1</div>
            </div>
          </Card>

          {/* Запись доступна */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-5 w-5" style={{ color: BLUE }} />
              <h2 className="text-base font-semibold">Запись доступна</h2>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Запись открыта с июня по август, только в рабочие дни (понедельник–пятница).</div>
              <div className="mt-1 font-medium text-gray-700">
                Возможность подачи заявления и документов в электронном формате — отсутствует.
              </div>
            </div>
          </Card>

          {/* Документы для подачи заявления */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5" style={{ color: BLUE }} />
              <h2 className="text-base font-semibold">Документы для подачи заявления</h2>
            </div>
            <div className="space-y-2">
              {(["9", "11"] as const).map((grade) => (
                <button
                  key={grade}
                  onClick={() => setDocsModal(grade)}
                  className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition"
                >
                  <span>После {grade === "9" ? "девятого" : "одиннадцатого"} класса</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </Card>

          {/* Документы для зачисления */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5" style={{ color: BLUE }} />
              <h2 className="text-base font-semibold">Документы для зачисления</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                "Документ об образовании государственного образца (оригинал + копия)",
                "Копия паспорта — 2 шт.",
                "Четыре фотографии 3×4 см (без головного убора)",
                "Медицинская справка по форме 086-У*",
                "Копия страхового медицинского полиса (2 стороны)",
                "Копия сертификата о прививках",
                "Копия СНИЛС",
                "Характеристика с последнего места учёбы, датированная текущим годом",
                "Приписное свидетельство (для юношей, достигших 17-летнего возраста)",
              ].map((doc, i) => (
                <li key={i} className="flex gap-3">
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
        </aside>
      </main>

      {/* Footer */}
      <footer
        style={{ background: BLUE, color: "#fff" }}
        className="py-4 text-sm text-center"
      >
        © {new Date().getFullYear()} ГБПОУ «Тверской колледж им. А.Н. Коняева»
      </footer>

      {/* Модальное окно документов */}
      {docsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDocsModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: BLUE }} />
                <h3 className="text-base font-semibold">
                  После {docsModal === "9" ? "девятого" : "одиннадцатого"} класса
                </h3>
              </div>
              <button
                onClick={() => setDocsModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100 transition"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <ul className="space-y-3 text-sm text-gray-600">
              {(docsModal === "9" ? DOCS_9 : DOCS_11).map((doc, i) => (
                <li key={i} className="flex gap-3">
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
          </div>
        </div>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}

import { BookOpen } from "lucide-react";
import { BLUE } from "../lib/constants";
import type { AllowedMonth } from "../lib/api";
import { Card } from "./Card";
import { CalendarView } from "./CalendarView";
import { TimePicker } from "./TimePicker";
import { RegistrationForm } from "./RegistrationForm";

type Step = "date" | "time" | "form";

export function RegistrationFlow({
  step,
  month,
  selectedDate,
  selectedTime,
  blockedDates,
  fullDates,
  openedWeekends,
  allowedMonths,
  onMonthChange,
  onDateSelect,
  onTimeSelect,
  onBack,
  onSuccess,
}: {
  step: Step;
  month: Date;
  selectedDate: Date | null;
  selectedTime: string | null;
  blockedDates: string[];
  fullDates: string[];
  openedWeekends: string[];
  allowedMonths: AllowedMonth[];
  onMonthChange: (d: Date) => void;
  onDateSelect: (d: Date) => void;
  onTimeSelect: (t: string) => void;
  onBack: () => void;
  onSuccess: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-gray-200 p-5">
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-1"
          style={{ color: BLUE }}
        >
          Приёмная комиссия
        </p>
        <h1 className="text-2xl font-bold text-gray-800">
          Запись на подачу документов
        </h1>
      </div>

      {step === "date" && (
        <div
          className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
          style={{ background: "#f8fafc" }}
        >
          <BookOpen className="h-5 w-5 shrink-0" style={{ color: BLUE }} />
          <ol className="flex flex-col gap-1 text-sm text-gray-600">
            <li>1. Выберите доступную дату в календаре.</li>
            <li>2. Выберите удобное время записи.</li>
            <li>3. Укажите ФИО и контактные данные.</li>
          </ol>
        </div>
      )}
      <div className="p-5">
        {step === "date" && (
          <CalendarView
            month={month}
            blockedDates={blockedDates}
            fullDates={fullDates}
            openedWeekends={openedWeekends}
            allowedMonths={allowedMonths}
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
    </Card>
  );
}

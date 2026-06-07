import { BLUE } from "../lib/constants";
import type { AllowedMonth } from "../lib/api";
import { Card } from "./Card";
import { StepBadge } from "./StepBadge";
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
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StepBadge active={step === "date"} done={step !== "date"} text="1. Дата" />
          <StepBadge active={step === "time"} done={step === "form"} text="2. Время" />
          <StepBadge active={step === "form"} done={false} text="3. Контакты" />
        </div>
      </div>
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

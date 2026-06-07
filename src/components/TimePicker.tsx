import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import { type SlotInfo, getSlotsStatus } from "../lib/api";
import { BLUE, BLUE_LIGHT, TIME_SLOTS } from "../lib/constants";
import { formatDisplayDate, toApiDate } from "../lib/utils";

export function TimePicker({
  selectedDate,
  onBack,
  onTimeSelect,
}: {
  selectedDate: Date;
  onBack: () => void;
  onTimeSelect: (t: string) => void;
}) {
  const [dateBlocked, setDateBlocked] = useState(false);
  const [slots, setSlots] = useState<Record<string, SlotInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSlotsStatus(toApiDate(selectedDate))
      .then((data) => {
        if (!active) return;
        setDateBlocked(data.date_blocked);
        setSlots(data.slots);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDate]);

  return (
    <div>
      <button
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: BLUE }}
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" /> Выбрать другую дату
      </button>

      <div
        className="mb-5 flex items-center gap-3 rounded-lg p-4"
        style={{ background: BLUE_LIGHT }}
      >
        <CalendarDays className="h-5 w-5" style={{ color: BLUE }} />
        <div>
          <h2 className="font-semibold">{formatDisplayDate(selectedDate)}</h2>
          <p className="text-sm text-gray-500">
            Выберите удобное время для визита.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Загружаем свободные места...
        </div>
      ) : dateBlocked ? (
        <div className="rounded-lg border border-gray-300 p-8 text-center font-medium text-gray-500 bg-gray-50">
          Запись на эту дату закрыта. Пожалуйста, выберите другой день.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {TIME_SLOTS.map((time) => {
            const info = slots[time];
            const occupied = info?.occupied ?? 0;
            const maxCap = info?.max_capacity ?? 3;
            const blocked = info?.is_blocked ?? false;
            const available = Math.max(0, maxCap - occupied);
            const disabled = blocked || available === 0;

            return (
              <button
                key={time}
                disabled={disabled}
                onClick={() => onTimeSelect(time)}
                className="flex items-center justify-between rounded-lg border p-4 text-left"
                style={{
                  background: disabled ? "#fafafa" : "#fff",
                  borderColor: disabled ? "#e0e0e0" : "#d0dde6",
                  color: disabled ? "#bbb" : "inherit",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = BLUE;
                    e.currentTarget.style.background = BLUE_LIGHT;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = "#d0dde6";
                    e.currentTarget.style.background = "#fff";
                  }
                }}
              >
                <span>
                  <span className="block text-lg font-bold">{time}</span>
                  <span className="text-sm">
                    {blocked
                      ? "Время недоступно"
                      : available === 0
                      ? "Мест нет"
                      : `Свободно: ${available} из ${maxCap}`}
                  </span>
                </span>
                <Clock className="h-5 w-5 text-gray-400" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { ArrowLeft, Mail, Phone, User } from "lucide-react";
import { registerApplication } from "../lib/api";
import { BLUE, BLUE_DARK, BLUE_LIGHT } from "../lib/constants";
import { EMAIL_RE, formatDisplayDate, formatPhone, toApiDate } from "../lib/utils";

type FormData = { fio: string; phone: string; email: string };

export function RegistrationForm({
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

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const phoneDigits = form.phone.replace(/\D/g, "");
    const localLen =
      phoneDigits.startsWith("7") || phoneDigits.startsWith("8")
        ? phoneDigits.length - 1
        : phoneDigits.length;
    if (localLen !== 10) {
      toast.error("Введите полный номер телефона: +7 (XXX) XXX-XX-XX");
      return;
    }
    if (!EMAIL_RE.test(form.email)) {
      toast.error("Введите корректный email: example@domain.ru");
      return;
    }

    setLoading(true);
    try {
      await registerApplication({
        ...form,
        registration_date: toApiDate(selectedDate),
        registration_time: selectedTime,
      });
      toast.success("Вы успешно записаны!");
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Не удалось отправить заявку"
      );
    } finally {
      setLoading(false);
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = BLUE;
    e.target.style.outline = "none";
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e5e7eb";
  };

  return (
    <div>
      <button
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: BLUE }}
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" /> Вернуться к выбору времени
      </button>

      <div
        className="mb-5 rounded-lg border p-4"
        style={{ borderColor: BLUE, background: BLUE_LIGHT }}
      >
        <div
          className="text-xs font-semibold uppercase tracking-wide mb-1"
          style={{ color: BLUE }}
        >
          Выбранная запись
        </div>
        <div className="text-lg font-bold text-gray-800">
          {formatDisplayDate(selectedDate)}, {selectedTime}
        </div>
      </div>

      <form className="grid gap-4" onSubmit={submit} noValidate>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-gray-700">
            ФИО абитуриента
          </span>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3"
              minLength={5}
              required
              value={form.fio}
              onChange={(e) => setForm({ ...form, fio: e.target.value })}
              placeholder="Иванов Иван Иванович"
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Телефон</span>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3"
                required
                type="tel"
                inputMode="numeric"
                value={form.phone}
                placeholder="+7 (900) 000-00-00"
                maxLength={18}
                onChange={(e) =>
                  setForm({ ...form, phone: formatPhone(e.target.value) })
                }
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3"
                required
                type="email"
                value={form.email}
                placeholder="name@example.ru"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </label>
        </div>

        <button
          className="mt-2 rounded-lg px-5 py-3 font-semibold text-white transition disabled:opacity-60"
          style={{ background: BLUE }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = BLUE_DARK;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = BLUE;
          }}
          disabled={loading}
          type="submit"
        >
          {loading ? "Отправляем..." : "Записаться"}
        </button>
      </form>
    </div>
  );
}

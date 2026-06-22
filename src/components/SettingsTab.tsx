import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { AlertCircle, Check, Clock, RefreshCw, Timer } from "lucide-react";
import {
  type ClockInfo,
  type SiteSettingsData,
  getClock,
  setClock,
  getSiteSettings,
  updateSiteSettings,
} from "../lib/api";
import { BLUE, BLUE_DARK } from "../lib/constants";

export function SettingsTab({
  token,
  onAuthError,
}: {
  token: string;
  onAuthError: () => void;
}) {
  return (
    <div className="space-y-8 max-w-2xl">
      <ClockSettings token={token} onAuthError={onAuthError} />
      <AdvanceHoursSettings token={token} onAuthError={onAuthError} />
    </div>
  );
}

// ─── Clock Settings ───────────────────────────────────────────────────────────

function ClockSettings({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const [clock, setClock_] = useState<ClockInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [tz, setTz] = useState("Europe/Moscow");

  const stableOnAuthError = useRef(onAuthError);
  useEffect(() => { stableOnAuthError.current = onAuthError; }, [onAuthError]);

  const load = () => {
    setLoading(true);
    getClock(token)
      .then((info) => {
        setClock_(info);
        setTz(info.timezone_name);
        if (info.manual_datetime) {
          const [d, t] = info.manual_datetime.split("T");
          setManualDate(d ?? "");
          setManualTime(t?.slice(0, 5) ?? "");
        }
      })
      .catch((e) => {
        if (e.message?.includes("401") || e.message === "Нет доступа") stableOnAuthError.current();
        else toast.error(e.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const handleSave = async () => {
    if (!manualDate || !manualTime) { toast.error("Укажите дату и время"); return; }
    setSaving(true);
    try {
      const info = await setClock(token, `${manualDate}T${manualTime}:00`, tz);
      setClock_(info);
      toast.success("Время установлено вручную");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const info = await setClock(token, null, tz);
      setClock_(info);
      setManualDate(""); setManualTime("");
      toast.success("Сброшено — используется серверное время");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 transition";

  return (
    <div className="rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: BLUE }}>
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Ручная установка времени</h2>
          <p className="text-xs text-gray-500">Если часы на сервере идут неправильно — задайте время вручную</p>
        </div>
      </div>

      {loading ? <div className="text-sm text-gray-400 py-2">Загрузка...</div> : (
        <>
          <div className="mb-5 rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ background: clock?.manual_datetime ? "#fef3c7" : "#f0fdf4" }}>
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0"
              style={{ color: clock?.manual_datetime ? "#92400e" : "#166534" }} />
            <div className="text-sm">
              <span className="font-semibold" style={{ color: clock?.manual_datetime ? "#92400e" : "#166534" }}>
                {clock?.manual_datetime ? "Установлено вручную" : "Серверное время"}
              </span>
              <div className="text-gray-600 mt-0.5">
                Текущее время системы: <strong>{clock?.effective_now?.replace("T", " ")}</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Дата</label>
              <input type="date" className={inp} value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Время</label>
              <input type="time" className={inp} value={manualTime} onChange={(e) => setManualTime(e.target.value)} />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-600 mb-1">Часовой пояс</label>
            <select className={inp} value={tz} onChange={(e) => setTz(e.target.value)}>
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
              <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
              <option value="Asia/Novosibirsk">Новосибирск (UTC+7)</option>
              <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
              <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
              <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button disabled={saving} onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
              style={{ background: BLUE }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = BLUE_DARK; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = BLUE; }}>
              <Check className="h-4 w-4" /> Установить время
            </button>
            {clock?.manual_datetime && (
              <button disabled={saving} onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
                <RefreshCw className="h-4 w-4" /> Сбросить (серверное время)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Advance Hours Settings ───────────────────────────────────────────────────

function AdvanceHoursSettings({ token, onAuthError }: { token: string; onAuthError: () => void }) {
  const [hours, setHours] = useState<number>(24);
  const [input, setInput] = useState("24");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const stableOnAuthError = useRef(onAuthError);
  useEffect(() => { stableOnAuthError.current = onAuthError; }, [onAuthError]);

  useEffect(() => {
    setLoading(true);
    getSiteSettings(token)
      .then((s) => {
        setHours(s.advance_hours);
        setInput(String(s.advance_hours));
      })
      .catch((e) => {
        if (e.message?.includes("401") || e.message === "Нет доступа") stableOnAuthError.current();
        else toast.error(e.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    const val = parseInt(input, 10);
    if (isNaN(val) || val < 0) { toast.error("Введите корректное число часов (0 или больше)"); return; }
    setSaving(true);
    try {
      const s = await updateSiteSettings(token, { advance_hours: val });
      setHours(s.advance_hours);
      setInput(String(s.advance_hours));
      toast.success(val === 0 ? "Ограничение снято — запись доступна в любое время" : `Минимальный срок записи: ${val} ч`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 transition";

  // Human-readable label
  const label = (() => {
    if (hours === 0) return "Без ограничений";
    if (hours < 24) return `${hours} ч`;
    const d = Math.floor(hours / 24);
    const h = hours % 24;
    return h > 0 ? `${d} дн. ${h} ч` : `${d} дн.`;
  })();

  return (
    <div className="rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: BLUE }}>
          <Timer className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Недоступный период записи</h2>
          <p className="text-xs text-gray-500">Пользователь не может записаться на ближайшие N часов от текущего момента. 0 = без ограничений.</p>
        </div>
      </div>

      {loading ? <div className="text-sm text-gray-400 py-2">Загрузка...</div> : (
        <>
          <div className="mb-5 rounded-lg px-4 py-3 flex items-center gap-3"
            style={{ background: hours === 0 ? "#f0fdf4" : "#eff6ff" }}>
            <div className="text-sm">
              <span className="font-semibold" style={{ color: hours === 0 ? "#166534" : "#1e40af" }}>
                Текущее ограничение:
              </span>
              <span className="ml-2 text-gray-700">{label}</span>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Количество часов (0 = без ограничений)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} max={720}
                className={inp}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <span className="text-sm text-gray-400 whitespace-nowrap">часов</span>
            </div>
            {parseInt(input) > 0 && !isNaN(parseInt(input)) && (
              <p className="text-xs text-gray-400 mt-1.5">
                = {(() => {
                  const v = parseInt(input);
                  const d = Math.floor(v / 24), h = v % 24;
                  return h > 0 ? `${d} дн. ${h} ч` : `${d} дн.`;
                })()}
              </p>
            )}
          </div>

          <button disabled={saving} onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ background: BLUE }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = BLUE_DARK; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = BLUE; }}>
            <Check className="h-4 w-4" /> Сохранить
          </button>
        </>
      )}
    </div>
  );
}

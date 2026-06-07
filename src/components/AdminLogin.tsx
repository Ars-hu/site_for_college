import { useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { LogIn, ShieldCheck } from "lucide-react";
import { loginAdmin } from "../lib/api";
import { BLUE, BLUE_DARK, BLUE_LIGHT } from "../lib/constants";

export function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const [capA] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [capB] = useState(() => Math.floor(Math.random() * 9) + 1);

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = BLUE;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e5e7eb";
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (parseInt(captchaAnswer, 10) !== capA + capB) {
      toast.error("Неверный ответ на проверочное задание");
      setCaptchaAnswer("");
      return;
    }
    setLoading(true);
    try {
      const res = await loginAdmin(username, password);
      onLogin(res.token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm p-6 sm:p-10">
      <div className="mb-6 text-center">
        <div
          className="mx-auto grid place-items-center rounded-full"
          style={{ width: 56, height: 56, background: BLUE_LIGHT }}
        >
          <ShieldCheck className="h-7 w-7" style={{ color: BLUE }} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-800">
          Вход для сотрудников
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Управление записями приёмной комиссии
        </p>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-gray-700">Логин</span>
          <input
            className="rounded-lg border border-gray-200 px-3 py-3 outline-none"
            required
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-gray-700">Пароль</span>
          <input
            className="rounded-lg border border-gray-200 px-3 py-3 outline-none"
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </label>

        <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">
            Проверочное задание:{" "}
            <strong>
              {capA} + {capB} = ?
            </strong>
          </p>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none text-center text-lg font-bold"
            required
            type="number"
            inputMode="numeric"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            placeholder="Ответ"
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold text-white transition disabled:opacity-60"
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
          <LogIn className="h-5 w-5" />
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>
    </div>
  );
}

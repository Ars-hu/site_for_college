import { useState } from "react";
import { toast } from "react-hot-toast";
import { Card } from "./ui/Card";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";

// Безопасное чтение токена: не падаем если sessionStorage недоступен
// (Safari Incognito, ограничения браузера, поврежденный storage)
function readStoredToken(): string {
  try {
    const raw = sessionStorage.getItem("admin_token") ?? "";
    // Проверяем что это похоже на JWT (три части через точку)
    if (raw && raw.split(".").length === 3) return raw;
    // Мусор в storage — чистим
    if (raw) sessionStorage.removeItem("admin_token");
    return "";
  } catch {
    return "";
  }
}

function saveToken(token: string) {
  try {
    sessionStorage.setItem("admin_token", token);
  } catch {
    // sessionStorage недоступен — работаем только в памяти
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem("admin_token");
  } catch {
    // ignore
  }
}

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState<string>(() => readStoredToken());

  const logout = () => {
    clearToken();
    setToken("");
  };

  return (
    <Card className="overflow-hidden">
      {token ? (
        <AdminDashboard
          token={token}
          onLogout={() => {
            logout();
            toast.success("Вы вышли из панели");
            onClose();
          }}
          onAuthError={() => {
            logout();
            toast.error("Сессия истекла. Войдите снова.");
          }}
        />
      ) : (
        <AdminLogin
          onLogin={(t) => {
            saveToken(t);
            setToken(t);
            toast.success("Вход выполнен");
          }}
        />
      )}
    </Card>
  );
}

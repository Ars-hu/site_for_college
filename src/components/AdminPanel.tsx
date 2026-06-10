import { useState } from "react";
import { toast } from "react-hot-toast";
import { Card } from "./ui/Card";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("admin_token") ?? ""
  );

  const logout = () => {
    sessionStorage.removeItem("admin_token");
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
            sessionStorage.setItem("admin_token", t);
            setToken(t);
            toast.success("Вход выполнен");
          }}
        />
      )}
    </Card>
  );
}
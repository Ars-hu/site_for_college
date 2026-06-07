import { CheckCircle2 } from "lucide-react";
import { BLUE, BLUE_DARK } from "../lib/constants";

export function StepBadge({
  active,
  done,
  text,
}: {
  active: boolean;
  done: boolean;
  text: string;
}) {
  const style = active
    ? { background: BLUE, color: "#fff", borderColor: BLUE }
    : done
    ? { background: "#e6f4fb", color: BLUE_DARK, borderColor: "#b3d9f0" }
    : { background: "#f5f5f5", color: "#999", borderColor: "#e0e0e0" };

  return (
    <div
      className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium border"
      style={style}
    >
      {done ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-current" />
      )}
      {text}
    </div>
  );
}

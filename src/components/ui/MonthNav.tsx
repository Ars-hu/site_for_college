import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthNav({
  month,
  onMonthChange,
  canGoBack = true,
  canGoForward = true,
  onPrev,
  onNext,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const handlePrev = onPrev
    ? onPrev
    : () => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));

  const handleNext = onNext
    ? onNext
    : () => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="flex gap-2">
      <button
        disabled={!canGoBack}
        className="grid h-9 w-9 place-items-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={handlePrev}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        disabled={!canGoForward}
        className="grid h-9 w-9 place-items-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={handleNext}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  isBefore,
  startOfToday
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalendarProps {
  onDateSelect: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfToday();

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-2 mb-6">
        <h2 className="text-xl font-bold capitalize text-gray-800">
          {format(currentMonth, 'LLLL yyyy', { locale: ru })}
        </h2>
        <div className="flex space-x-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return (
      <div className="grid grid-cols-7 mb-2 border-b pb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const isDisabled = isBefore(day, today) || !isSameMonth(day, monthStart);

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "relative h-14 sm:h-20 border-r border-b flex flex-col items-center justify-center transition-all cursor-pointer group",
              isDisabled ? "bg-gray-50 cursor-not-allowed" : "hover:bg-blue-50",
              !isSameMonth(day, monthStart) && "text-gray-300"
            )}
            onClick={() => !isDisabled && onDateSelect(cloneDay)}
          >
            <span className={cn(
              "text-sm font-medium",
              isDisabled ? "text-gray-300" : "text-gray-700",
              isSameDay(day, today) && "text-blue-600 font-bold underline"
            )}>
              {formattedDate}
            </span>
            {!isDisabled && (
              <div className="mt-1 flex flex-col items-center">
                <span className="text-[10px] text-green-600 font-bold">🙂</span>
                <span className="hidden sm:inline text-[9px] text-gray-400">Есть места</span>
              </div>
            )}
            {isDisabled && isSameMonth(day, monthStart) && (
              <div className="mt-1 flex flex-col items-center opacity-50">
                <span className="text-[10px]">😪</span>
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 border-l border-t" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="rounded-lg overflow-hidden border-r border-b">{rows}</div>;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {renderHeader()}
      <div className="bg-white">
        {renderDays()}
        {renderCells()}
      </div>
      
      <div className="mt-6 flex flex-wrap gap-4 text-sm justify-center">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🙂</span>
          <span className="text-gray-600">— Есть места для записи</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">😪</span>
          <span className="text-gray-600">— Нет мест для записи</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

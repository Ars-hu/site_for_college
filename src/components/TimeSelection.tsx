import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TimeSelectionProps {
  selectedDate: Date;
  onTimeSelect: (time: string) => void;
  onReset: () => void;
}

const TimeSelection: React.FC<TimeSelectionProps> = ({ selectedDate, onTimeSelect, onReset }) => {
  const [slotStatus, setSlotStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00"
  ];

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const res = await axios.get(`http://localhost:5000/api/slots-status/${dateStr}`);
        setSlotStatus(res.data);
      } catch (err) {
        console.error("Ошибка при получении статуса слотов", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [selectedDate]);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="flex-1 space-y-6">
        <div className="text-center md:text-left">
          <button 
            onClick={onReset}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full text-sm font-medium transition mb-4 shadow-md"
          >
            Сбросить выбор
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800">
            Места для записи <br /> 
            на {format(selectedDate, 'dd. MM. yyyy', { locale: ru })}
          </h2>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Загрузка мест...</div>
          ) : (
            timeSlots.map((time) => {
              const taken = slotStatus[time] || 0;
              const available = Math.max(0, 3 - taken);
              const isFull = available <= 0;

              return (
                <div 
                  key={time}
                  className={cn(
                    "flex items-center justify-between p-1 bg-white border rounded-lg shadow-sm transition",
                    isFull ? "opacity-60 bg-gray-50 border-gray-100" : "border-gray-100"
                  )}
                >
                  <div className="flex items-center space-x-4 ml-2">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-xl",
                      isFull ? "bg-gray-200" : "bg-green-500"
                    )}>
                      {isFull ? "😪" : "🙂"}
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className={cn(
                        "font-bold text-lg",
                        isFull ? "text-gray-400" : "text-gray-700"
                      )}>{time}</span>
                      <span className={cn(
                        "text-sm",
                        isFull ? "text-gray-300" : "text-gray-400"
                      )}>— Свободно {available}</span>
                    </div>
                  </div>
                  <button 
                    disabled={isFull}
                    onClick={() => onTimeSelect(time)}
                    className={cn(
                      "px-6 py-2 rounded-lg text-sm font-bold transition mr-1",
                      isFull 
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                        : "bg-teal-500 hover:bg-teal-600 text-white shadow-sm"
                    )}
                  >
                    {isFull ? "Мест нет" : "Сюда"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="hidden lg:block w-96">
        <div className="bg-teal-400/20 border border-teal-200 rounded-[2rem] p-8 sticky top-24">
          <div className="bg-teal-500 text-white py-3 px-6 rounded-2xl -mt-12 mb-6 text-center shadow-lg">
            <h3 className="text-xl font-bold tracking-tight">Необходимые документы:</h3>
          </div>
          <ul className="space-y-3 text-sm text-gray-700 leading-snug">
            {[
              "Заявление установленной формы (заполняется на месте в электронной форме)",
              "Заявление о согласии на обработку персональных данных (заполняется на месте в электронной форме)",
              "Документы, удостоверяющие личность, гражданство (подлинник и 2 копии)",
              "Документ об образовании и (или) квалификации (подлинник и копия)",
              "4 фотографии размером 3Х4 см",
              "Оригинал или копию документа, подтверждающего право преимущественного или первоочередного приема",
              "Справка о результатах ГИА",
              "Медицинская справка формы 286 (только для ИТК)",
              "Медицинский полис (2 копии)",
              "СНИЛС (копия)"
            ].map((text, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold flex-shrink-0">{i+1}.</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TimeSelection;

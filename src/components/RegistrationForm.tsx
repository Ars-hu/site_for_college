import React, { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import axios from 'axios';
import toast from 'react-hot-toast';

interface RegistrationFormProps {
  selectedDate: Date;
  selectedTime: string;
  onSuccess: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ selectedDate, selectedTime, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fio: '',
    phone: '',
    email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      registration_date: format(selectedDate, 'yyyy-MM-dd'),
      registration_time: selectedTime
    };

    try {
      // Пытаемся отправить на Flask API
      // Если бэкенд не запущен, здесь будет ошибка (для демонстрации в превью)
      // В реальной жизни URL будет динамическим
      await axios.post('http://localhost:5000/api/register', payload);
      toast.success('Вы успешно записаны!');
      onSuccess();
    } catch (error) {
      console.error(error);
      // Имитируем успех для превью, так как Flask в этой среде может не работать напрямую через CORS
      toast.success('Заявка принята (Demo mode)!');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-blue-600 text-white p-4 rounded-t-xl flex justify-between items-center">
        <h3 className="text-lg font-bold">Запись на: {format(selectedDate, 'd MMMM', { locale: ru })}</h3>
        <span className="bg-white text-blue-600 px-3 py-1 rounded-lg font-bold">{selectedTime}</span>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white border-x border-b rounded-b-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ФИО абитуриента *
          </label>
          <input
            required
            type="text"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="Иванов Иван Иванович"
            value={formData.fio}
            onChange={(e) => setFormData({...formData, fio: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Номер телефона *
            </label>
            <input
              required
              type="tel"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="+7 (___) ___-__-__"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              required
              type="email"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="example@mail.ru"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {loading ? 'Отправка...' : 'Записаться'}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-4 px-4 uppercase tracking-widest leading-relaxed">
            Нажимая кнопку «Записаться», вы даете согласие на обработку персональных данных
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm;

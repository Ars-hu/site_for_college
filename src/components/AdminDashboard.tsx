import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Application {
  id: number;
  fio: string;
  phone: string;
  email: string;
  registration_date: string;
  registration_time: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }

    // Имитируем загрузку данных из API
    const demoData: Application[] = [
      {
        id: 1,
        fio: "Иванов Иван Иванович",
        phone: "+7 900 123-45-67",
        email: "ivan@test.ru",
        registration_date: "2024-06-25",
        registration_time: "10:30",
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        fio: "Петрова Анна Сергеевна",
        phone: "+7 911 333-22-11",
        email: "ann@mail.ru",
        registration_date: "2024-06-26",
        registration_time: "14:00",
        created_at: new Date().toISOString()
      }
    ];

    setTimeout(() => {
      setApps(demoData);
      setLoading(false);
    }, 500);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    toast.success('Вы вышли из системы');
    navigate('/admin');
  };

  const filteredApps = apps.filter(app => 
    app.fio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Список заявок</h1>
          <p className="text-gray-500 text-sm">Всего заявок: {apps.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Экспорт Excel</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest border-b">
                <th className="px-6 py-4 font-bold">ФИО</th>
                <th className="px-6 py-4 font-bold">Контакты</th>
                <th className="px-6 py-4 font-bold">Дата</th>
                <th className="px-6 py-4 font-bold">Время</th>
                <th className="px-6 py-4 font-bold text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Загрузка данных...</td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Заявок пока нет</td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{app.fio}</div>
                      <div className="text-[10px] text-gray-400">ID: {app.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{app.phone}</div>
                      <div className="text-gray-400 text-xs">{app.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-600">
                      {app.registration_date}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 px-2 py-1 rounded font-bold text-gray-700">
                        {app.registration_time}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

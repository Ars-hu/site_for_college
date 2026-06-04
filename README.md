# Тверской колледж им. А. Н. Коняева

Веб-приложение для предварительной записи абитуриентов в приемную комиссию.

## Стек

- Frontend: React, Vite, Tailwind CSS.
- Backend: Flask, SQLAlchemy, PyJWT.
- База данных: SQLite по умолчанию, можно заменить через `DATABASE_URL`.
- Docker: frontend отдается через nginx, `/api` проксируется в Flask backend.

## Запуск через Docker

Из корня проекта:

```bash
docker compose up --build
```

После запуска:

- сайт: `http://localhost:8080`
- backend внутри Docker: `backend:5000`
- API с браузера доступен через frontend: `http://localhost:8080/api/...`

Данные администратора по умолчанию:

- логин: `admin`
- пароль: `admin123`

Остановить контейнеры:

```bash
docker compose down
```

Остановить контейнеры и удалить volume с SQLite-базой:

```bash
docker compose down -v
```

## Локальный запуск без Docker

### Backend

```bash
cd backend
venv\Scripts\activate
python run.py
```

API будет доступен на `http://localhost:5000`.

### Frontend

В новом терминале из корня проекта:

```bash
npm install --registry=https://registry.npmjs.org
npm run dev
```

Фронт будет доступен на `http://localhost:5173`.

Vite проксирует `/api` на `http://localhost:5000`.

## Проверка сборки

```bash
npm run build
```

## API

- `GET /api/slots-status/<yyyy-mm-dd>` - занятость временных слотов.
- `POST /api/register` - создание заявки.
- `POST /api/admin/login` - вход администратора.
- `GET /api/admin/applications` - список заявок, нужен header `Authorization`.

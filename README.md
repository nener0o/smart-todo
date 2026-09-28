# Умный список задач

Учебный проект по дисциплине «Проектный практикум».

Планировщик дел, который понимает русский язык: пользователь пишет задачу одной строкой —
«сдать отчёт в пятницу в 15:00» — а сервис сам извлекает срок, очищает название и показывает,
что именно распознал, ещё до сохранения.

## Возможности

- Регистрация и вход (JWT), у каждого пользователя свой список.
- Создание задачи из свободного текста с автоопределением даты и времени:
  `завтра`, `послезавтра`, `через 2 дня`, `в пятницу`, `до понедельника`, `к четвергу`,
  `5 октября`, `30.09`, `в 15:00`, `в 7 вечера`, `утром / вечером`.
- Живой предпросмотр разбора во время набора.
- Категории, приоритеты (низкий / средний / высокий), отметка выполнения, inline-редактирование, удаление.
- Вкладки: все / сегодня / просроченные / предстоящие / без даты / выполненные.
- Фильтр по категории и приоритету, поиск по названию, счётчики.
- Адаптивный интерфейс для телефона и компьютера.

## Стек

| Слой | Технологии |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, SQLite, PyJWT, bcrypt, dateparser |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router |
| Тесты | pytest, httpx (28 тестов) |
| Инфраструктура | Docker, docker-compose, Nginx, GitHub Actions |

Подробнее об архитектуре, схеме БД и API — в [`docs/architecture.md`](docs/architecture.md).

## Быстрый запуск через Docker

```bash
docker compose up --build
```

Приложение откроется на <http://localhost:4317>. Данные сохраняются в volume `todo-data`.

## Запуск для разработки

Нужны Python 3.12+ и Node.js 22+.

### Бэкенд

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8471
```

API: <http://127.0.0.1:8471>, Swagger UI: <http://127.0.0.1:8471/docs>.
База SQLite создаётся автоматически в `backend/smart_todo.db`.

Настройки — через переменные окружения с префиксом `SMART_TODO_` или файл `backend/.env`
(пример в `backend/.env.example`).

### Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Интерфейс: <http://127.0.0.1:4317>. Dev-сервер проксирует `/api` на бэкенд (порт 8471).

### Тесты и проверки

```bash
cd backend && pytest -q            # 28 тестов API и парсера
cd frontend && npm run lint && npx tsc -b && npm run build
```

## Работа в VS Code

Откройте файл `smart-todo.code-workspace` (File → Open Workspace from File) — он подхватит
настройки, рекомендуемые расширения и готовые задачи:

- `Terminal → Run Build Task` (Ctrl+Shift+B) — запускает бэкенд и фронтенд одновременно.
- `Terminal → Run Test Task` — прогоняет pytest.
- `Run and Debug` (F5) → «Всё приложение (backend + frontend)» — отладка FastAPI с брейкпоинтами
  и открытие интерфейса в Chrome.

Перед первым запуском выполните задачи `backend: install deps` и `frontend: install deps`
(Terminal → Run Task).

## Структура репозитория

```
backend/            FastAPI-приложение
  app/              код: модели, схемы, auth, nlp, роутеры
  tests/            pytest
frontend/           React-приложение (Vite)
  src/api/          типизированный клиент API
  src/auth/         контекст аутентификации
  src/components/   умный ввод, элемент задачи, UI-примитивы
  src/pages/        страницы входа и задач
docs/               бэклог, пользовательские истории, архитектура, спринты, презентация
.github/workflows/  CI
docker-compose.yml  запуск всего приложения
```

## Документация проекта

Все артефакты по методологии (бэклог, пользовательские истории с критериями приёмки,
пользовательские сценарии, планы и отчёты спринтов, ретроспективы, журнал решений,
чек-лист тестирования, структура презентации) — в папке [`docs/`](docs/README.md).

## API кратко

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/api/auth/register` | Регистрация |
| `POST` | `/api/auth/login` | Вход |
| `GET` | `/api/auth/me` | Текущий пользователь |
| `POST` | `/api/tasks/parse` | Предпросмотр разбора текста |
| `GET` | `/api/tasks` | Список с фильтрами `scope`, `category`, `priority`, `search` |
| `POST` | `/api/tasks` | Создать задачу из текста |
| `PATCH` | `/api/tasks/{id}` | Обновить |
| `POST` | `/api/tasks/{id}/toggle` | Выполнено / не выполнено |
| `DELETE` | `/api/tasks/{id}` | Удалить |
| `GET` | `/api/tasks/stats` | Счётчики |
| `GET` | `/api/tasks/categories` | Категории пользователя |

Полное описание — в Swagger UI (`/docs`) и в [`docs/architecture.md`](docs/architecture.md).

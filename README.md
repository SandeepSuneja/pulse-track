# Pulse Track

Personal workspace for planned work, time logs, goals, and progress charts.

React (Vite) frontend + FastAPI/SQLite backend, with Firebase Authentication.

## What it does

| Area | What you get |
|---|---|
| **Board** | Kanban tasks: To Do → In Progress → Done. Optional start/due dates, category, and link to a goal. |
| **Activities** | Time logs against **In Progress** tasks. Edit or delete logs. Task title on logs stays in sync when you rename the task. |
| **Goals** | Hours target (daily/weekly/monthly) **or** a due date (not both). Optional start date. Link one or more Board tasks. **Complete** an active goal. Missed due dates become **Failed** and cannot be edited. Due date cannot be changed once set. |
| **Dashboard** | Period snapshot: logged time, activity count, category mix, and active goal progress. |
| **Analytics** | Day / week / month / year. Minutes over time, breakdown **by category** and **by task**. |
| **Profile** | Display name, bio, timezone. |

Categories: health, learning, work, sleep, entertainment, personal technical projects, AI content generation, others.

## How the pieces connect

1. Create **tasks** on the Board.
2. Move a task to **In Progress**.
3. **Log time** on Activities (or from a goal’s Log time form).
4. Create a **goal**, associate Board tasks, and complete it — or let a missed due date mark it **Failed**.
5. Review time on **Dashboard** and **Analytics**.

Goals count time from linked tasks. If a goal has no linked tasks yet, category time is used as a fallback.

## Architecture

| Choice | Why |
|---|---|
| **React + Vite** | Fast UI for the board, forms, and charts. |
| **MUI + Recharts** | Components and pictorial progress. |
| **FastAPI** | Typed REST API, docs at `/docs`. |
| **Firebase Auth** | Google popup + email/password. No passwords stored in this app. |
| **SQLite + SQLAlchemy** | Local-first data with no extra DB setup. Schema migrations run on API startup. |

### Auth flow

1. Sign in on `/login` with **Google** or **email**.
2. The frontend holds a Firebase ID token.
3. API calls send `Authorization: Bearer <token>`.
4. FastAPI verifies the token (Firebase Admin SDK), then loads or creates a `users` row by `firebase_uid`.
5. Tasks, activities, goals, and analytics are scoped to that user.

Use **http://localhost:5173** (not mixed with `127.0.0.1`) so the auth session stays on one origin.

Optional local-only skip: set `DEV_SKIP_AUTH=true` on the backend to accept `Bearer dev:<uid>` tokens. Never enable this in production. The current login UI expects real Firebase config.

## Project layout

```
pulse-track/
  backend/     FastAPI app, SQLite (pulse_track.db)
  frontend/    React + Vite app
```

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

- API: http://127.0.0.1:8000
- Health: http://127.0.0.1:8000/api/health
- Docs: http://127.0.0.1:8000/docs

### Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

App: http://localhost:5173

Fill `frontend/.env` with Firebase web config (`VITE_FIREBASE_*`) and keep `VITE_API_URL=http://127.0.0.1:8000`.

## Enable Firebase Auth

1. Create a Firebase project.
2. **Authentication → Sign-in method** — enable **Google** and **Email/Password**.
3. Add a **Web app** and copy config into `frontend/.env`.
4. Add `localhost` (and `127.0.0.1` if you use it) under **Authorized domains**.
5. Backend: download a service account key as `backend/firebase-service-account.json`, **or** fill `FIREBASE_*` in `backend/.env`.
6. Keep `DEV_SKIP_AUTH=false` for real sign-in.

Allow popups for localhost if Google sign-in is blocked.

## Main API

| Resource | Endpoints |
|---|---|
| Users | `GET/PATCH /api/users/me` |
| Tasks | `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/{id}` |
| Activities | `GET/POST /api/activities`, `GET/PATCH/DELETE /api/activities/{id}` |
| Goals | `GET/POST /api/goals`, `PATCH/DELETE /api/goals/{id}` |
| Analytics | `GET /api/analytics/summary?period=day\|week\|month\|year` |

Analytics returns total minutes, category breakdown, **task breakdown**, time series, and active goal progress.

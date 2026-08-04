# Pulse Track

Personal activity tracking, time planning, effort scoring, and progress charts.

## Why this architecture

| Choice | Why |
|---|---|
| **React (Vite)** | Fast UI for dashboards/forms/charts with a simple modern toolchain. |
| **Python FastAPI** | Typed REST API, auto docs at `/docs`, easy to extend. |
| **Firebase Authentication** | Handles signup/login/password security so we do not store passwords. |
| **SQLite + SQLAlchemy** | Local-first app data (activities, goals, effort) with zero DB setup. |
| **Recharts** | Pictorial progress (bars, pies, lines) by parameter and time period. |

### How auth works

1. User lands on the **login screen** and signs in with **Google, GitHub, Microsoft**, or email/password.
2. Frontend gets a short-lived **Firebase ID token** (popup OAuth or email flow).
3. Every API call sends `Authorization: Bearer <token>`.
4. FastAPI verifies the token with **Firebase Admin SDK**, then loads/creates a local `users` row keyed by `firebase_uid`.
5. All activities/goals/effort/analytics queries are scoped to that user — each person only sees their own track record.

This keeps identity with Firebase and domain data (your logs & charts) in your API database.

### Local demo mode (no Firebase project yet)

Both sides ship with `DEV_SKIP_AUTH` / `VITE_DEV_SKIP_AUTH` enabled so you can run the full app immediately:

- Frontend uses a synthetic user and token `dev:demo-user`
- Backend accepts `dev:<uid>` tokens when `DEV_SKIP_AUTH=true`

Turn these off and add real Firebase credentials before any real deployment.

## Project layout

```
pulse-track/
  backend/          FastAPI app
  frontend/         React + Vite app
```

## Run locally

### 1) Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### 2) Frontend

```powershell
cd frontend
npm run dev
```

App: http://127.0.0.1:5173

## Enable Firebase Auth (Google + other providers)

1. Create a Firebase project.
2. **Authentication → Sign-in method** — enable:
   - Google
   - GitHub (add OAuth app credentials from GitHub Developer Settings)
   - Microsoft (register app in Azure AD)
   - Email/Password (optional, for email sign-in)
3. Add a **Web app** and copy config into `frontend/.env` (`VITE_FIREBASE_*`).
4. Add `127.0.0.1` and `localhost` to **Authorized domains** in Firebase Auth settings.
5. Create a service account key JSON and save as `backend/firebase-service-account.json`
   (or fill `FIREBASE_*` in `backend/.env`).
6. Set `VITE_DEV_SKIP_AUTH=false` and `DEV_SKIP_AUTH=false` for production.

Until Firebase is configured, use **Continue as demo user** on the login screen (when `VITE_DEV_SKIP_AUTH=true`).

## Core features

- **Profile** — display name, bio, timezone (per user)
- **Activities** — log timed work with category + focus/energy/productivity scores
- **Effort check-in** — daily scores for focus, consistency, productivity, energy, wellbeing
- **Goals** — daily/weekly/monthly minute targets by category
- **Dashboard & Analytics** — charts for time and effort across day/week/month/year

## How progress charts are built

`GET /api/analytics/summary?period=week|month|year|day`

- Sums activity minutes in the selected window
- Breaks time down by category (pie)
- Builds day-by-day time series (bar/line)
- Aggregates effort parameters over the same window (line + averages)
- Compares active goals vs actual minutes in matching categories

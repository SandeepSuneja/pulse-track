# Pulse Track — Web frontend

React + Vite SPA for Pulse Track. Shares the **FastAPI backend** and **Firebase Auth** project with the Flutter mobile app.

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | How web, mobile, and API connect |
| [docs/UI-ABILITIES.md](../docs/UI-ABILITIES.md) | Screen-by-screen web capabilities |
| [docs/DEPLOY-AWS.md](../docs/DEPLOY-AWS.md) | S3 / CloudFront deploy |
| Root [README.md](../README.md) | Full monorepo setup |

---

## Stack

- **React** + **Vite**
- **MUI** components
- **Recharts** (Dashboard / Analytics)
- **Firebase JS SDK** (Google + email/password)
- API client: `src/api.js` → `VITE_API_URL`

---

## Run locally

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173** (prefer `localhost` over `127.0.0.1` for Firebase session consistency).

### Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend origin, e.g. `http://127.0.0.1:8000` |
| `VITE_FIREBASE_*` | Web Firebase config from the Firebase console |

---

## Routes (signed-in)

| Path | Screen |
|------|--------|
| `/` | Board |
| `/dashboard` | Dashboard |
| `/activities` | Activities |
| `/goals` | Goals |
| `/analytics` | Analytics |
| `/api-docs` | Embedded Swagger |
| `/profile` | Profile |
| `/login`, `/register` | Auth |

---

## Build

```powershell
npm run build
```

Output: `dist/` — upload to S3 for CloudFront (see [DEPLOY-AWS.md](../docs/DEPLOY-AWS.md)).

---

## Notes

- Visual theme: dark navy + cyan tokens in `src/index.css` (mobile “Web” theme mirrors this).
- Activity logs only attach to **In Progress** tasks.
- Sleep quality rules match the backend and mobile client.

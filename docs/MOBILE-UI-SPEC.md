# Pulse Track — Mobile UI Specification

Use this document to build a native mobile app (iOS/Android) with the **same abilities** as the web app. It describes each main screen, the data it needs, API calls, validation rules, and user flows.

For a shorter feature list, see [UI-ABILITIES.md](./UI-ABILITIES.md). For AWS deployment, see [DEPLOY-AWS.md](./DEPLOY-AWS.md).

---

## 1. Architecture for mobile

### Auth

- Sign in with **Firebase** (Google or email/password) — same Firebase project as the web app.
- After sign-in, obtain a Firebase **ID token** and send it on every API request:

```http
Authorization: Bearer <firebase_id_token>
```

- The backend verifies the token, then creates or loads a `users` row keyed by `firebase_uid`.
- On first authenticated API call, the user profile is auto-provisioned from Firebase email/display name.

### Base URL

Configure the production API origin (App Runner / ECS HTTPS URL). Example:

```text
https://your-api.example.com
```

All paths below are relative to that base.

### Health check

```http
GET /api/health
→ 200 {"status":"ok","service":"pulse-track"}
```

### CORS

CORS applies to browsers only. Native mobile apps ignore CORS. No extra AWS config is required for mobile.

---

## 2. Shared enums and constants

Use these exact string values in API payloads and UI pickers.

### Task status

| Value | UI label | Meaning |
|---|---|---|
| `todo` | To Do | Not started |
| `in_progress` | In Progress | Active; **only status that accepts time logs** |
| `completed` | Done | Finished |

### Task / goal category

| ID | Display label |
|---|---|
| `health` | Health |
| `learning` | Learning |
| `work` | Work |
| `sleep` | Sleep |
| `entertainment` | Entertainment |
| `personal_technical_projects` | Personal Technical Projects |
| `ai_content_generation` | AI Content Generation |
| `others` | Others |

### Goal period

| Value | Used when |
|---|---|
| `daily` | Hour target, reset conceptually per day |
| `weekly` | Hour target per week |
| `monthly` | Hour target per month |
| `deadline` | Due-date goal (no hour target) |

### Goal status

| Value | UI label | Editable? |
|---|---|---|
| `active` | Active | Yes |
| `completed` | Completed | No (can delete) |
| `failed` | Failed | No (auto-set when due date passes) |

### Ticket display id

Tasks are shown as **`PT-{id}`** (e.g. `PT-42`). This is a display convention, not a separate field.

### Date format

API uses ISO dates: `"2026-08-23"`. Durations are in **minutes** (integer, 1–1440).

---

## 3. Core user flow

```text
Board: create task → move to In Progress
        ↓
Activities: log time (duration + date + notes) against In Progress task
        ↓
Goals: optional — link tasks, set hour/due target, track progress
        ↓
Dashboard / Analytics: charts and summaries
        ↓
Profile: display name, timezone, bio
```

**Critical rule:** Time logs (`activities`) can only be **created** for tasks with `status === "in_progress"`. The web app enforces this in Activities and Goals; mobile must too.

---

## 4. Board

**Web route:** `/`  
**Purpose:** Kanban task management — plan work and move items through To Do → In Progress → Done.

### 4.1 What the user sees

1. **Page header** — title + short help (“Only In Progress tasks can be logged in Activities”).
2. **New task** button (top-right).
3. **Three columns:**
   - **To Do** (`todo`)
   - **In Progress** (`in_progress`)
   - **Done** (`completed`)
4. Each column shows a **count badge** and a scrollable list of **task cards**.

### 4.2 Task card content

Display on each card:

| Field | Source | Notes |
|---|---|---|
| Ticket id | `PT-{task.id}` | Always show |
| Title | `task.title` | Primary text |
| Due date | `task.due_date` | Format e.g. “Aug 14”; highlight if overdue and not completed |
| Goal | `task.goal_title` | If linked goal exists |
| Category | `task.category` | Color-coded chip |
| Activity stats | `task.activity_count`, `task.logged_minutes` | e.g. “3 activities · 120 min” |

### 4.3 User actions

| Action | Behavior |
|---|---|
| Tap card | Open task detail / edit screen |
| Drag between columns | `PATCH /api/tasks/{id}` with new `status` |
| New task | Open create form (default status `todo`) |
| Add in To Do column | Same as New task |
| Edit | Open form with task fields |
| Delete | `DELETE /api/tasks/{id}` — also deletes linked activity logs (DB cascade) |

### 4.4 Task form fields

| Field | Create | Edit | API field | Validation |
|---|---|---|---|---|
| Title | Required | Editable | `title` | 1–200 chars |
| Category | Required | Editable | `category` | One of category IDs |
| Status | Default `todo` | Editable | `status` | `todo` \| `in_progress` \| `completed` |
| Start date | Optional | Editable | `start_date` | ISO date or null |
| Due date | Optional | Editable | `due_date` | ISO date or null |
| Notes | Optional | Editable | `notes` | Text |
| Goal | Optional | Editable | `goal_id` | Must be **active** goal; picker filtered by task category |
| Estimate minutes | Optional (default 60) | Editable | `estimate_minutes` | 1–1440 |

**Goal link rule:** Backend rejects `goal_id` if goal is not `active` (404 or 400).

### 4.5 Task detail — activities tab (edit only)

When editing a task, the web app has a second tab listing **read-only** activity logs for that task.

| Action | API |
|---|---|
| Load logs for task | `GET /api/activities?task_id={id}` |

Show: date, duration, notes per log. Editing logs is done on the **Activities** screen, not here.

### 4.6 API reference — Board

```http
GET    /api/tasks
GET    /api/tasks?status=in_progress
GET    /api/tasks?category=work
GET    /api/tasks?goal_id=5
GET    /api/tasks/{id}
POST   /api/tasks
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}
GET    /api/goals          # for goal picker (active goals)
```

**TaskOut response (key fields):**

```json
{
  "id": 42,
  "title": "Write API docs",
  "category": "work",
  "status": "in_progress",
  "notes": "",
  "start_date": "2026-08-01",
  "due_date": "2026-08-30",
  "estimate_minutes": 60,
  "goal_id": 3,
  "goal_title": "Ship v1",
  "logged_minutes": 120,
  "activity_count": 2,
  "created_at": "2026-08-10T12:00:00Z"
}
```

**Create example:**

```json
POST /api/tasks
{
  "title": "New task",
  "category": "work",
  "status": "todo",
  "notes": "",
  "start_date": null,
  "due_date": "2026-09-01",
  "goal_id": null
}
```

**Status change (drag):**

```json
PATCH /api/tasks/42
{ "status": "in_progress" }
```

### 4.7 Mobile UX suggestions

- Use a horizontal swipe board or three stacked sections on phone.
- Drag-and-drop or a status picker sheet both work; must call `PATCH` on change.
- Overdue: `due_date < today` AND `status !== "completed"`.
- Optimistic UI for column moves; revert on API error.

---

## 5. Activities

**Web route:** `/activities`  
**Purpose:** Create, edit, delete, and browse **time logs** tied to In Progress tasks.

### 5.1 What the user sees

1. **Page header** — explains link to Board and Goals.
2. **Activity logs** panel:
   - Summary line: count + total minutes (filtered).
   - **New activity** button (opens modal).
   - **Filter bar** (see below).
   - **Table / list** of logs.

### 5.2 Filter bar

All filters are **client-side** on the web app (loads all logs once). Mobile can do the same or use query params server-side.

| Filter | Client logic | Server alternative |
|---|---|---|
| Search | Match title, notes, or `PT-{id}` (case-insensitive) | — |
| Category | Exact match on `activity.category` | `GET /api/activities?category=work` |
| Task | Match `task_id` | `GET /api/activities?task_id=42` |
| From date | `activity_date >= from` | `GET /api/activities?start_date=2026-08-01` |
| To date | `activity_date <= to` | `GET /api/activities?end_date=2026-08-31` |

Combine server params for efficient mobile pagination later; current API returns full list sorted by date desc.

### 5.3 Log list columns

| Column | Field |
|---|---|
| Date | `activity_date` |
| Task | `title` + `PT-{task_id}` |
| Category | `category` (display label) |
| Duration | `duration_minutes` + “min” |
| Notes | `notes` or “—” |
| Actions | Edit, Delete |

### 5.4 New / Edit activity form

| Field | Create | Edit | API field | Rules |
|---|---|---|---|---|
| Task | Picker | **Read-only** | `task_id` | Create: only `in_progress` tasks |
| Date | Required | Editable | `activity_date` | ISO date |
| Duration | Required | Editable | `duration_minutes` | 1–1440 |
| Notes | Optional | Editable | `notes` | Text |

**On create:** Backend copies `title` and `category` from the task. Response `title`/`category` always reflect **live task** data (renames sync).

**On edit:** Only `notes`, `activity_date`, `duration_minutes` can change — **not** `task_id`.

**Create error (400):** `"Only In Progress tasks can receive activity logs..."` if task is not `in_progress`.

### 5.5 Data loading

On screen open, parallel fetch:

```http
GET /api/activities
GET /api/tasks?status=in_progress
```

Default selected task in create form: first In Progress task, or empty state if none.

### 5.6 API reference — Activities

```http
GET    /api/activities
GET    /api/activities?start_date=&end_date=&task_id=&category=
GET    /api/activities/{id}
POST   /api/activities
PATCH  /api/activities/{id}
DELETE /api/activities/{id}
```

**ActivityOut:**

```json
{
  "id": 10,
  "task_id": 42,
  "title": "Write API docs",
  "category": "work",
  "notes": "Morning session",
  "activity_date": "2026-08-23",
  "duration_minutes": 90,
  "created_at": "2026-08-23T10:00:00Z"
}
```

**Create:**

```json
POST /api/activities
{
  "task_id": 42,
  "activity_date": "2026-08-23",
  "duration_minutes": 60,
  "notes": ""
}
```

**Update:**

```json
PATCH /api/activities/10
{
  "activity_date": "2026-08-24",
  "duration_minutes": 45,
  "notes": "Updated"
}
```

### 5.7 Mobile UX suggestions

- **New activity** as bottom sheet or full-screen form.
- Show empty state when no In Progress tasks with link to Board.
- List: use `FlatList` with sticky filter header.
- Confirm before delete.

---

## 6. Goals

**Web route:** `/goals`  
**Purpose:** Set time or deadline targets, link Board tasks, log time from goal context, mark complete.

### 6.1 What the user sees

Two main areas (web uses side-by-side; mobile can use tabs or stacked sections):

1. **New goal / Edit goal** form
2. **Your goals** list

### 6.2 Goal form fields

| Field | Rules |
|---|---|
| Title | Required, 1–200 chars |
| Category | Required; filters linkable tasks |
| Target type | **Target hours** OR **Due date** — mutually exclusive |
| Target hours | Required in hours mode; sent as `target_minutes = hours × 60` |
| Period | Required in hours mode: `daily` \| `weekly` \| `monthly` |
| Due date | Required in due-date mode; **`end_date` locked after first save** |
| Start date | Optional |
| Associated tasks | Multi-select; same category only; sets `task_ids` |

**Due date locked:** Once `end_date` is saved, UI must not allow changing or clearing it (backend returns 400).

**Failed / completed goals:** Form edit blocked in web UI; backend rejects field updates on non-active goals.

### 6.3 Goal list item content

| Element | Source |
|---|---|
| Title | `goal.title` |
| Status pill | `goal.status` → Active / Completed / Failed |
| Meta line | Category, hours/period OR due date, start date, task count |
| Linked tasks | `goal.tasks[]` → `PT-{id} {title}` |
| Progress | See §6.4 |
| Failed message | If `status === "failed"`, show missed due date |

### 6.4 Progress calculation

**Hour-based goals (active):**

- Web uses **weekly** analytics slice: `GET /api/analytics/summary?period=week` → `goal_progress[]` matched by `goal_id`.
- Shows: `actual_minutes / target_minutes` and `completion_pct` with progress bar.

**Deadline goals:**

- Count minutes logged between `start_date` (or beginning) and `end_date` on linked tasks (or category fallback).
- No percentage bar when `target_minutes` is null.

**Goal progress in analytics** scales target by selected period length (daily/weekly/monthly). For Goals screen weekly bar, use `period=week`.

**Category fallback:** If goal has **no linked tasks**, progress uses activity minutes where `activity.category === goal.category`.

**Linked tasks priority:** If `task_ids` non-empty, only activities on those tasks count.

### 6.5 Goal actions

| Action | API | Notes |
|---|---|---|
| Create | `POST /api/goals` | Include `task_ids` |
| Edit | `PATCH /api/goals/{id}` | Active only; omit `end_date` if locked |
| Complete | `PATCH /api/goals/{id}` `{ "status": "completed" }` | Active only |
| Delete | `DELETE /api/goals/{id}` | Unlinks tasks (`goal_id` → null) |
| Log time | `POST /api/activities` | Inline form; same as Activities |

**Log time from goal:**

1. User taps **Log time** on active goal.
2. Show task picker: In Progress tasks that are linked to goal OR (if no links) same category.
3. Submit activity create payload.

### 6.6 Auto-fail overdue goals

Backend runs on `GET /api/goals` and analytics: active goals with `end_date < today` → `status = "failed"`. Mobile should refresh goal list on screen focus.

### 6.7 API reference — Goals

```http
GET    /api/goals
POST   /api/goals
PATCH  /api/goals/{id}
DELETE /api/goals/{id}
```

**Create (hours goal):**

```json
POST /api/goals
{
  "title": "Learn Rust",
  "category": "learning",
  "target_minutes": 300,
  "period": "weekly",
  "start_date": null,
  "task_ids": [12, 15]
}
```

**Create (deadline goal):**

```json
POST /api/goals
{
  "title": "Finish course",
  "category": "learning",
  "end_date": "2026-09-30",
  "period": "deadline",
  "target_minutes": null,
  "task_ids": [12]
}
```

**GoalOut (abbreviated):**

```json
{
  "id": 3,
  "title": "Ship v1",
  "category": "work",
  "target_minutes": 600,
  "period": "weekly",
  "start_date": null,
  "end_date": null,
  "status": "active",
  "is_active": true,
  "task_ids": [42, 43],
  "tasks": [
    { "id": 42, "title": "Write API docs", "status": "in_progress", "category": "work" }
  ]
}
```

### 6.8 Mobile UX suggestions

- Separate **Goal detail** screen with actions: Edit, Log time, Complete, Delete.
- Disable edit UI for completed/failed with explanation.
- Inline log form can be a bottom sheet pre-filtered to goal’s tasks.

---

## 7. Dashboard

**Web route:** `/dashboard`  
**Purpose:** At-a-glance summary for a selected time window — not for editing data.

### 7.1 What the user sees

1. **Header** — “Your pulse today” + **period toggle**: `day` | `week` | `month` | `year`
2. **Quick actions** — deep links to Board, Activities, Goals
3. **Stat tiles** (4)
4. **Charts** — time by day (bar), category mix (pie)
5. **Goal progress** list with bars

### 7.2 Period → date range (server-side)

| Period | Range |
|---|---|
| `day` | Today only |
| `week` | Start of current week (Monday) → today |
| `month` | 1st of month → today |
| `year` | Jan 1 → today |

### 7.3 Stat tiles

| Tile | API field |
|---|---|
| Logged time | `total_minutes` → display as hours (÷ 60, 1 decimal) |
| Activities | `activity_count` |
| Categories | `category_breakdown.length` |
| Goals | `goal_progress.length` |

Subtitle on logged time: `start_date → end_date`.

### 7.4 Charts

**Time by day**

- Data: `minutes_over_time[]` — `{ date, value }` for every day in range (zeros included).
- Chart: bar chart, Y = minutes.

**Category mix**

- Data: `category_breakdown[]` — `{ category, minutes, percentage }`.
- Chart: donut/pie. Empty → prompt to log first activity.

**Goal progress**

- Data: `goal_progress[]`:

```json
{
  "goal_id": 3,
  "title": "Ship v1",
  "category": "work",
  "period": "weekly",
  "target_minutes": 600,
  "actual_minutes": 240,
  "completion_pct": 40.0
}
```

- Show progress bar when `target_minutes > 0`.
- Deadline goals may show `target_minutes: 0` — display logged minutes only.

### 7.5 API

```http
GET /api/analytics/summary?period=day|week|month|year
```

Optional custom range (not used on web Dashboard):

```http
GET /api/analytics/summary?period=custom&start_date=2026-08-01&end_date=2026-08-23
```

### 7.6 Mobile UX suggestions

- Default period: `week` (web Dashboard) — consider same.
- Pull-to-refresh on summary.
- Quick actions as buttons or FAB menu.
- Use native charts (Swift Charts, MPAndroidChart, etc.) with same data shapes.

---

## 8. Analytics

**Web route:** `/analytics`  
**Purpose:** Deeper exploration of time — same API as Dashboard but different layout and default period (`month`).

### 8.1 What the user sees

1. **Header** + period toggle (`day` | `week` | `month` | `year`)
2. **Logged minutes over time** — full-width chart
3. **Two columns** (stack on mobile):
   - **By category** — pie + list
   - **By task** — horizontal bar + list

### 8.2 Time series chart type

| Period | Web chart |
|---|---|
| `day` | Bar chart |
| `week`, `month`, `year` | Line chart |

Same data: `minutes_over_time[]`.

### 8.3 By category panel

- Pie chart from `category_breakdown[]`
- List: category label, `hoursLabel(minutes) · percentage%`
- Subtitle: date range string

### 8.4 By task panel

- Data: `task_breakdown[]`:

```json
{
  "task_id": 42,
  "title": "PT-42 · Write API docs",
  "category": "work",
  "minutes": 180,
  "percentage": 35.2
}
```

- Horizontal bar chart (one bar per task)
- List with task name, category subtitle, minutes, percentage
- Chart height scales with task count on web

### 8.5 API

Same as Dashboard:

```http
GET /api/analytics/summary?period=month
```

### 8.6 Mobile UX suggestions

- Default period: `month`.
- Segmented control for period.
- Task breakdown: scrollable list; chart optional on small screens.
- Share/export is not in web scope — skip unless you add it.

---

## 9. Profile

**Web route:** `/profile`  
**Purpose:** Edit app-specific user profile (stored in backend DB, not Firebase profile alone).

### 9.1 What the user sees

Form fields:

| Field | Editable | Source |
|---|---|---|
| Email | **No** | `GET /api/users/me` → `email` (from Firebase) |
| Display name | Yes | `display_name` |
| Timezone | Yes | `timezone` (e.g. `Asia/Kolkata`, default `UTC`) |
| Bio | Yes | `bio` |

**Save profile** button; success/error feedback.

### 9.2 API

```http
GET  /api/users/me
PATCH /api/users/me
```

**UserOut:**

```json
{
  "id": 1,
  "firebase_uid": "abc123",
  "email": "user@example.com",
  "display_name": "Sandy",
  "bio": "",
  "timezone": "Asia/Kolkata",
  "created_at": "2026-01-01T00:00:00Z"
}
```

**Update (partial):**

```json
PATCH /api/users/me
{
  "display_name": "Sandy",
  "timezone": "Asia/Kolkata",
  "bio": "Building Pulse Track"
}
```

### 9.3 Mobile UX suggestions

- Timezone: use system timezone as default picker value.
- Email read-only with hint “Managed by your sign-in provider”.
- Optional: sync Firebase `updateProfile` for display name if you want parity with Firebase console (web does not require this).

---

## 10. Screen → API matrix

| Screen | Primary reads | Primary writes |
|---|---|---|
| **Board** | `GET /api/tasks`, `GET /api/goals` | `POST/PATCH/DELETE /api/tasks` |
| **Activities** | `GET /api/activities`, `GET /api/tasks?status=in_progress` | `POST/PATCH/DELETE /api/activities` |
| **Goals** | `GET /api/goals`, `GET /api/tasks`, `GET /api/activities`, `GET /api/analytics/summary?period=week` | `POST/PATCH/DELETE /api/goals`, `POST /api/activities` |
| **Dashboard** | `GET /api/analytics/summary?period=` | — |
| **Analytics** | `GET /api/analytics/summary?period=` | — |
| **Profile** | `GET /api/users/me` | `PATCH /api/users/me` |

---

## 11. Error handling (mobile)

| HTTP | Typical cause | User message |
|---|---|---|
| 401 | Missing/expired token | Re-authenticate |
| 404 | Task/goal/activity not found | “Item no longer exists” |
| 400 | Business rule (not In Progress, failed goal edit, due date change) | Show `detail` string from JSON body |
| Network | Offline / bad URL | “Cannot reach the API” |

Refresh Firebase ID token before retry on 401.

---

## 12. Suggested mobile navigation

Map web sidebar to mobile tabs or drawer:

| Tab | Screen |
|---|---|
| Board | Kanban (home) |
| Dashboard | Summary |
| Activities | Log list |
| Goals | Goal list + editor |
| Analytics | Charts |
| Profile | Settings |

Auth stack: Login / Register (Firebase) → main tabs after token available.

---

## 13. Parity checklist

Use this when implementing each screen:

- [ ] **Board** — 3 columns, drag/status change, CRUD, goal link, activity tab on edit, overdue styling
- [ ] **Activities** — filters, table, modal CRUD, In Progress-only create, edit without task change
- [ ] **Goals** — hours vs due modes, task linking, progress bar, complete, auto-fail display, inline log
- [ ] **Dashboard** — 4 periods, 4 stats, 2 charts, goal list
- [ ] **Analytics** — 4 periods, line/bar time chart, category pie, task bars
- [ ] **Profile** — read email, edit name/timezone/bio
- [ ] **Auth** — Firebase Google + email, Bearer token on all `/api/*`
- [ ] **Categories** — all 8 values with labels and colors
- [ ] **PT-{id}** — consistent task ticket display

---

## 14. Related files in this repo

| Path | Relevance |
|---|---|
| `frontend/src/pages/*.jsx` | Web UI reference implementations |
| `frontend/src/api.js` | Exact API paths used by web |
| `frontend/src/constants.js` | Categories and colors |
| `backend/app/schemas.py` | Request/response validation |
| `backend/app/routers/*.py` | Business rules and endpoints |
| `docs/UI-ABILITIES.md` | Short feature overview |

OpenAPI docs when backend is running: `{API_URL}/docs`

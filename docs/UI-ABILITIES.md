# Pulse Track — UI Abilities

What users can do in the web app, organized by screen and interaction. This document describes **UI capabilities only** (not API or deployment).

---

## Overview

Pulse Track is a personal workspace for planned work, time logs, goals, and progress charts.

| Area | Primary UI |
|---|---|
| **Board** | Kanban tasks (To Do → In Progress → Done) |
| **Activities** | Time logs against In Progress tasks |
| **Goals** | Hour or due-date targets linked to Board tasks |
| **Dashboard** | Period snapshot: stats, time/sleep charts, category mix, goal progress |
| **Analytics** | Deeper time breakdown by category and task |
| **Profile** | Display name, timezone, bio |

**Categories** (used on tasks, logs, and goals): Health, Learning, Work, Sleep, Entertainment, Personal Technical Projects, AI Content Generation, Others.

**Typical flow:** create tasks on the Board → move to In Progress → log time in Activities → track progress on Goals, Dashboard, and Analytics.

---

## Global shell (signed-in)

Every main page shares the same frame.

### Sidebar

- Navigate to **Board**, **Dashboard**, **Activities**, **Goals**, **Analytics**, **Profile**
- See signed-in user (avatar + name/email)
- **Sign out**

On mobile, the sidebar opens from a hamburger menu in the top bar.

### Top bar

- Shows current page name (e.g. `PULSE TRACK · Board`)
- **Signal live** status badge on larger screens

### Session loading

While Firebase checks the session, a full-screen splash shows a spinner and short message before redirecting to login or the app.

---

## Authentication

Routes: `/login`, `/register`

### Login

- **Continue with Google** (Firebase)
- **Sign in with email** — expandable form with email and password
- Link to create an account

### Register

- **Continue with Google**
- **Sign up with email** — display name, email, password
- Link to sign in

If Firebase is not configured in `frontend/.env`, a warning appears on the auth card.

---

## Board (`/`)

Default home. Kanban for tasks. **Only In Progress tasks can receive time logs** on the Activities page.

### Page actions

- **New task** — opens create dialog (defaults to To Do)
- **Add to To Do** — quick add from the To Do column header or empty column

### Kanban columns

| Column | User can |
|---|---|
| **To Do** | View, create, edit, delete, drag tasks in/out |
| **In Progress** | Same; tasks here are eligible for Activities logging |
| **Done** | Same; completed work |

### Task cards

Each card shows:

- Ticket id (`PT-{id}`)
- Title
- Due date (overdue highlighted)
- Linked goal name (if any)
- Category chip (color-coded)
- Activity count and total minutes logged

**Interactions:**

- **Drag and drop** between columns (updates status)
- **Click card** — open edit dialog
- **Edit / Delete** — icon buttons on the card

### Task dialog (modal)

Used for **New task** and **Edit task**.

**When editing**, two tabs:

1. **Activities** — read-only list of time logs for this task (date, duration, notes)
2. **Task information** — editable task fields

**Fields:**

| Field | Notes |
|---|---|
| Title | Required |
| Category | One of the shared categories |
| Status | To Do, In Progress, Done |
| Start date | Optional |
| Due date | Optional |
| Notes | Optional |
| Goal | Optional link to an active goal (filtered by category) |

**Actions:** Save, Cancel, Delete (when editing)

---

## Activities (`/activities`)

Log and review time against **In Progress** Board tasks. Matching category time can also advance Goals.

### Activity logs panel

- View all logs in a **scrollable table**
- See summary: log count and total minutes (updates with filters)
- **New activity** — opens create modal (top-right)
- **Clear filters** — when any filter is active

### Table columns

| Column | Content |
|---|---|
| Date | Log date |
| Task | Title + `PT-{id}` |
| Category | From linked task (color chip; sleep also shows Ideal/Normal/Bad quality) |
| Duration | Minutes (or hours for long blocks) |
| Notes | Truncated in table; full text in modal |
| Actions | Edit, Delete |

### Filters (above table)

| Filter | Behavior |
|---|---|
| Search | Task title, notes, or PT-id |
| Category | All or one category |
| Task | All or one linked task |
| From / To | Date range |

### New / Edit activity modal

Same form for create and edit.

| Field | Create | Edit |
|---|---|---|
| Task | Pick from In Progress tasks | Read-only (shows linked task) |
| Date | Required | Editable |
| Duration | Hours + minutes for most categories | Editable |
| Sleep start / wake | Required when task category is **Sleep** (duration is calculated) | Editable |
| Notes | Optional | Editable |

For **Sleep** tasks, the form shows computed duration and a live **Ideal / Normal / Bad** quality badge.

**Sleep quality rules:**

| Rating | Conditions |
|---|---|
| Ideal | Wake 6:00–6:30 AM and sleep ≥ 7 hours |
| Normal | Wake 6:30–7:30 AM and sleep ≥ 7 hours |
| Bad | Anything else (including under 7 hours) |

On create, if the selected task already has logs, a hint shows prior count and minutes.

**Actions:** Save log / Save changes, Cancel

---

## Goals (`/goals`)

Set targets, link Board tasks, log time, and mark goals complete. Missed due dates can mark a goal **Failed** (not editable afterward).

### New goal / Edit goal (left panel)

| Field | Notes |
|---|---|
| Title | Required |
| Category | Filters linkable tasks |
| Target type | **Target hours** or **Due date** (mutually exclusive for new goals) |
| Target hours + period | Hours with daily / weekly / monthly (hours mode) |
| Due date | Required in due-date mode; **locked** after first save |
| Start date | Optional |
| Associated Board tasks | Checkboxes — same category only |

**Actions:** Create goal, Save changes, Cancel (when editing)

Completed and failed goals cannot be edited.

### Your goals (right panel)

Each goal card shows:

- Title and **status** — Active, Completed, Failed
- Meta: category, hours/period or due date, linked task list
- **Progress bar** — for active hour-based goals (weekly actual vs target)
- Failed goals show a missed due-date message

**Actions (active goals):**

| Action | Effect |
|---|---|
| Edit | Opens left panel with goal data |
| Log time | Inline form: task, date, duration, notes |
| Complete | Marks goal completed |
| Delete | Removes goal |

**Log time inline form:** only **In Progress** tasks linked to the goal (or same category if no tasks linked). Saves a new activity log. For Sleep tasks, uses sleep start/wake times and shows quality like Activities.

---

## Dashboard (`/dashboard`)

High-level snapshot for a chosen period.

### Period selector

Toggle: **day**, **week**, **month**, **year** (top-right).

### Quick actions

Links to Board, Activities, and Goals.

### Stat tiles

| Tile | Shows |
|---|---|
| Logged time | Total hours for period + date range |
| Activities | Number of log entries |
| Categories | Count of categories with time |
| Goals | Count of active goal targets |

### Charts (two equal-height rows)

Row 1:

- **Time by day** — bar chart of minutes over the period
- **Sleep by day** — bar chart of sleep hours; bar color = Ideal (green) / Normal (blue) / Bad (red); legend when data exists; empty state links to Activities

Row 2:

- **Category mix** — donut chart; empty state links to Activities
- **Goal progress** — active goals with progress bars (actual / target minutes and %); empty state links to Goals; long lists scroll inside the panel

All four panels share the same fixed height so the layout stays even across periods and empty states.

---

## Analytics (`/analytics`)

Deeper charts than Dashboard. Default period: **month**.

### Period selector

Same day / week / month / year toggle as Dashboard.

### Logged minutes over time

- **Day** — bar chart
- **Week / month / year** — line chart

### By category

- Donut chart
- List with minutes/hours and percentage per category
- Date range label

### By task

- Horizontal bar chart (height grows with task count)
- List with task name, category, minutes, and percentage

Empty states when no data exists for the selected period.

---

## Profile (`/profile`)

Manage app profile (separate from Firebase account email).

| Field | Editable |
|---|---|
| Email | No (read-only) |
| Display name | Yes |
| Timezone | Yes (e.g. `Asia/Kolkata`) |
| Bio | Yes |

**Action:** Save profile — shows success or error message.

---

## Cross-page links

The UI links related areas so users do not hunt for context:

| From | To |
|---|---|
| Activities header | Goals, Board |
| Goals | Board (create/link tasks) |
| Dashboard quick actions | Board, Activities, Goals |
| Dashboard / Analytics empty states | Activities or Goals |
| Board task dialog | Link to active goals |
| Auth footer | Login ↔ Register |

---

## Responsive behavior

| Breakpoint | Behavior |
|---|---|
| **Desktop** | Permanent sidebar; two-column layouts on Dashboard, Goals |
| **Tablet / mobile** | Collapsible sidebar; single-column grids; task action buttons always visible on cards |
| **Activities table** | Horizontal scroll inside capped height; filters stack on small screens |

---

## Visual system (brief)

- Dark “orbital” theme — cyan accents, Syne + Space Grotesk fonts
- **Panels** — bordered cards with subtle grid background
- **Category colors** — consistent chips on Board and in lists (`frontend/src/constants.js`)
- **Sleep quality colors** — Ideal green, Normal blue, Bad red on badges and Dashboard sleep bars
- **Modals** — Board tasks and Activities use MUI dialogs; Goals uses inline expand for log time
- **Motion** — page transitions and kanban card animations on Board
- **Dashboard panels** — four chart/list panels share equal fixed height

---

## What the UI does not do

- No in-app user management or admin panel
- No bulk import/export from the UI
- No mobile-native app (web SPA only; API is shared for future mobile)
- Task status cannot be changed from Activities — use the Board
- Failed goals cannot be reopened or edited from the UI

For **mobile app development** (API payloads, business rules, screen-by-screen spec), see [MOBILE-UI-SPEC.md](./MOBILE-UI-SPEC.md).

For architecture and API details, see [README.md](../README.md). For AWS deployment, see [DEPLOY-AWS.md](./DEPLOY-AWS.md).

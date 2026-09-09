# Pulse Track — Mobile (Flutter)

Native **Android / iOS** client for the same Pulse Track REST API and **Firebase project** as the web app.

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | **System architecture** — how web, mobile, and API connect |
| [docs/MOBILE.md](../docs/MOBILE.md) | Product overview, screens, parity with web |
| [docs/MOBILE-UI-SPEC.md](../docs/MOBILE-UI-SPEC.md) | API contracts, fields, validation rules |
| [docs/UI-ABILITIES.md](../docs/UI-ABILITIES.md) | Web UI abilities (shared product rules) |

---

## How mobile fits in

```text
Flutter app ──Bearer Firebase token──► FastAPI ──► SQLite / PostgreSQL
     │                                    │
     └── Firebase Auth (same project as web)
```

See [ARCHITECTURE.md](../docs/ARCHITECTURE.md) for full diagrams.

---

## Features

| Screen | Capabilities |
|--------|----------------|
| **Login** | Google, email/password, register toggle, forgot password |
| **Board** | Status filter pills, vertical task cards with category left accent, create/edit/delete, goal link |
| **Activities** | Summary with hours+minutes, search + category + date, CRUD, sleep Ideal/Normal/Bad |
| **Goals** | Hours or deadline mode, link tasks, progress, complete/delete |
| **Dashboard** | Day / Week / **30 days** / **By month**; time & sleep charts; stats; goal progress |
| **Analytics** | Same ranges + **Year**; category pie; time-over-time charts; by-task |
| **Profile** | Name, timezone, bio; **Appearance** (Light / Dark / Web); API debug |

**Not on mobile:** API Docs — use the backend Swagger UI at `{API}/docs`.

**Navigation:** bottom tabs — Board, Dashboard, Activities, Goals, Analytics, Profile.

---

## Requirements

- Flutter SDK (stable), Android SDK for APK / emulator
- Same Firebase project as web (`pulse-track-3d1b5`)
- Backend reachable locally **or** deployed HTTPS API

---

## Configuration

Runtime config lives in `lib/config/app_config.dart`.

### API base URL (auto)

On startup the app probes `http://127.0.0.1:8000/api/health`:

| Result | API used |
|--------|----------|
| Reachable | Local backend |
| Not reachable | Deployed API (default below) |

Default deployed origin:

```text
https://pu-33c5978573c14366842f5c7087cb4002.ecs.us-east-1.on.aws
```

Overrides (`--dart-define`):

| Define | Effect |
|--------|--------|
| `API_BASE_URL=https://…` | Force exact origin |
| `USE_LOCAL_API=true` | Always local |
| `USE_DEPLOYED_API=true` | Always deployed |
| `DEPLOYED_API_BASE_URL=https://…` | Change deployed default |
| `LOCAL_API_BASE_URL=http://…` | Change local probe/target |
| `USE_DEV_AUTH=true` | Optional `Bearer dev:<uid>` (needs backend `DEV_SKIP_AUTH=true`) |

Profile → **API** shows the resolved URL and whether the source is local or deployed.

### Firebase

- Options: `lib/firebase_options.dart` (same keys as web `VITE_FIREBASE_*`)
- Android: `android/app/google-services.json`
- Package id: `com.pulsetrack.pulse_track_mobile`

### Themes

| Theme | Look |
|-------|------|
| Light | White + corporate blue |
| Dark | Black surfaces + soft blue |
| Web | Navy + cyan (matches web) |

Change under **Profile → Appearance**. Preference is stored on device (`theme_style`).

---

## Run (emulator / USB device)

```powershell
# Optional: tunnel host API into Android emulator
adb reverse tcp:8000 tcp:8000

cd mobile
flutter pub get
flutter run
```

Without `adb reverse`, bind the API and point the emulator at the host alias:

```powershell
# backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# mobile
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

Physical device on LAN:

```powershell
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:8000
```

Asset / theme / config changes need a **full restart** (not hot reload).

---

## Install on a physical Android phone

### Build release APKs

```powershell
cd mobile
flutter build apk --release --split-per-abi
# or one universal APK:
flutter build apk --release
```

| Output | Use for |
|--------|---------|
| `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk` | Most modern phones (**recommended**) |
| `build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk` | Older 32-bit phones |
| `build/app/outputs/flutter-apk/app-release.apk` | Universal (larger) |

Release builds currently use the **debug signing config** (see `android/app/build.gradle.kts`) so sideloading works without a Play Store keystore. Add a release keystore before shipping to production stores.

### Install via USB

1. Enable **Developer options → USB debugging**
2. Connect the phone and accept the trust prompt
3. Install:

```powershell
adb devices
adb install -r build\app\outputs\flutter-apk\app-arm64-v8a-release.apk
```

### Install by copying the APK

1. Copy `app-arm64-v8a-release.apk` to the phone
2. Open it and allow **Install unknown apps** for that source
3. Launch **Pulse Track**

On a real phone, localhost is not available, so the app uses the **deployed API** after the health probe fails.

---

## Google Sign-In on Android

Google Sign-In needs an **Android** OAuth client in Firebase (created after you add a SHA-1).

1. Firebase Console → Project settings → Your apps → Android (`com.pulsetrack.pulse_track_mobile`)
2. Add fingerprint (debug SHA-1 example):

```text
C4:71:B5:D6:4C:2F:2A:13:9A:C5:AE:60:53:8F:60:D6:FA:91:00:CE
```

Get the machine SHA-1 with:

```powershell
cd mobile\android
.\gradlew signingReport
```

3. Download a fresh `google-services.json` into `android/app/` (should include `client_type: 1` and `client_type: 3`)
4. Full restart the app

The app uses the Web client ID as `serverClientId` so Firebase receives an ID token. Email/password works without the Android OAuth client.

---

## UI / branding

- Themes: Light / Dark / Web (`lib/theme/pulse_palette.dart`, `theme_controller.dart`, `app_theme.dart`)
- Pulse-wave circular logo (vector `BrandLogo` + PNG launcher icons)
- Category colors match web (`lib/constants/categories.dart`)
- Sleep quality Ideal / Normal / Bad (`lib/constants/sleep.dart`) — same rules as backend/web
- Durations display as hours and minutes (`formatDuration`)

### Board layout (mobile-specific)

- Status **filter pills** with counts (not drag-and-drop Kanban)
- Tasks listed **vertically** for the selected status
- Cards: ticket id, category chip, title, due date, activity stats, linked goal; **left border** = category color
- Status changes via the edit sheet

### Dashboard / Analytics periods

| Pill | Meaning |
|------|---------|
| Day / Week | Same as API `period` |
| 30 days | Rolling last 30 days (`period=custom`) |
| By month | User-picked calendar month (`period=custom`) |
| Year | Analytics only — year-to-date monthly rollup |

---

## Project layout

```text
mobile/
  lib/
    main.dart                 # Firebase, API resolve, ThemeController
    firebase_options.dart
    config/app_config.dart    # API / Firebase / dev auth defines
    constants/                # categories, sleep rules
    models/models.dart
    router/app_router.dart
    services/
      api_client.dart
      auth_service.dart
    screens/                  # login, shell tabs, CRUD sheets
    theme/
      app_theme.dart
      pulse_palette.dart
      theme_controller.dart
    widgets/                  # brand, common, chart_series, analytics_period
  android/                    # Gradle, google-services.json, launcher icons
  ios/
  assets/images/
  pubspec.yaml
```

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| API unreachable on emulator | `adb reverse tcp:8000 tcp:8000` or `API_BASE_URL=http://10.0.2.2:8000` |
| Phone always hits deployed API | Expected if local backend is not on the device; use LAN IP via `API_BASE_URL` |
| Google sign-in fails | Add SHA-1, refresh `google-services.json`, full restart |
| Theme only half-applied | Quit `flutter run` and **full restart** (not hot reload) |
| Assets / theme not updating | Full restart |
| Deployed API 503 | Confirm the ECS/App Runner URL; override `DEPLOYED_API_BASE_URL` |

# Google Play store listing assets

Ready-to-upload graphics for **Play Console → Store presence → Main store listing**.

## Upload these

| File | Play field | Spec |
|---|---|---|
| `app-icon-512.png` | App icon | 512×512, 32-bit PNG, ≤1024 KB. Full square — Play adds corners/shadow. |
| `feature-graphic-1024x500.png` (or `.jpg`) | Feature graphic | Exactly 1024×500, JPEG or 24-bit PNG **no alpha**. |
| `phone-01-board-1080x1920.png` | Phone screenshots | Portrait 1080×1920 (9:16), 24-bit PNG no alpha. |
| `phone-02-activities-1080x1920.png` | | Upload **all four** (Play needs ≥2; ≥4 at ≥1080px helps recommendations). |
| `phone-03-goals-1080x1920.png` | | |
| `phone-04-analytics-1080x1920.png` | | |

## Rules followed

- Icon: no rounded corners, no outer drop shadow, no ranking/price badges.
- Feature graphic + screenshots: no transparency (flattened RGB).
- Screenshots stay within Play aspect limits (longer side ≤ 2× shorter).

## Rebuild

```bash
python store/play/build_assets.py
```

Sources live in `sources/`. Replace those files if you regenerate art, then rebuild.

## Optional later

- 7-inch / 10-inch tablet screenshots
- Promo video (YouTube URL)
- Localized graphics per language

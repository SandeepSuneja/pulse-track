# Pulse Track — Release notes

**Version:** 1.0.4 (5)  
**Track:** Closed / Internal testing (Play Console)

## What’s new (paste into Play Console)

Play Console limit is **500 characters** per language. Use this:

```
What’s new in 1.0.4

• Declared no Advertising ID use and removed AD_ID from the Android build
• Fixed Google Sign-In on Play Store builds so you can sign in more reliably
• Improved goals and board screens for clearer progress tracking
• General UI polish and stability fixes
```

**Character count:** under the 500 limit.

## Short variant (if you prefer tighter copy)

```
1.0.4: No Advertising ID; more reliable Google Sign-In; goals UI and stability improvements.
```

## Full / internal changelog (for testers or your notes)

### Fixes
- Google Sign-In error handling and configuration guidance for Play / Firebase SHA setups
- Release builds can use proper upload signing via `key.properties` (Play AAB)

### Improvements
- Goals screen layout and progress presentation
- Shared UI widgets and board polish
- Theme / shell consistency across main tabs

### Notes for testers
- Please verify: Google sign-in, email sign-in, board → log time → goals → analytics flow
- Privacy policy is available on the web app at `/privacy`

## Previous versions (context)

| Version | Notes |
|---|---|
| 1.0.0 | Initial mobile release (board, activities, goals, analytics, Firebase auth) |
| 1.0.3 | Sign-in fix + UI polish + release signing |

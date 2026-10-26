# VidyaSaathi — mobile app

The native iOS and Android app for VidyaSaathi, built with Expo and React Native.
It is not a website inside an app: every screen is drawn natively. It talks to the
same FastAPI backend as the website and looks the same.

## Run it on your phone (no Xcode or Android Studio needed)

1. **Start the backend** from the project root, as usual:

   ```bash
   .venv/bin/python scripts/run_server.py      # listens on port 8000
   ```

2. **Install and start the app** (first time: `npm install`):

   ```bash
   cd MOBILE
   npm install
   npx expo start
   ```

3. **Open it on your phone.** Install **Expo Go** from the App Store or Play Store,
   then scan the QR code printed in the terminal (iPhone: use the Camera app).

Your phone and your computer must be on the **same Wi-Fi**. The app finds the
backend automatically at `http://<your computer's address>:8000`.

### If the app can't reach the backend

Tell it the address yourself. Find your computer's local IP
(macOS: `ipconfig getifaddr en0`) and start the app with:

```bash
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.20:8000 npx expo start
```

Also check that your firewall allows port 8000.

## Demo accounts

| Who | Email | Password |
| --- | --- | --- |
| Student | `demo@vidyasaathi.in` | `DemoStudent@123` |
| Staff portal | `admin@vidyasaathi.in` | `DemoStudent@123` |

The sign-in screen also has a one-tap demo button.

## What is shared with the website

The app does **not** copy the website's logic. It imports these straight from
`FRONTEND/src/core/`:

- `api.ts`: every backend call, sign-in and token refresh
- `types.ts`: the data shapes
- `i18n.ts`: all English and Hindi text

Fix something there and both the website and the app get it. The app never
changes anything under `FRONTEND/`.

## Project layout

```
src/app/           screens (Expo Router: one file = one screen)
  (auth)/          sign in, sign up, verify, forgot / reset password, staff door
  (app)/           tabs: home, new lesson, path, lessons, progress + lab, profile, report, review, admin
  (focus)/learn/   the live classroom (video, checkpoints, notes)
src/features/classroom/   classroom WebSocket controller, question card, panels
src/components/    design system: ui, motion, brand, landing, lesson, charts, lab
src/theme/         colours, fonts and the tw("…") style helper (same tokens as the website)
src/core/          the bridge to FRONTEND/src/core (storage, backend address)
```

## Checks

```bash
npx tsc --noEmit     # typecheck
npx expo lint        # lint
```

## Building a real app (to install without Expo Go)

Use EAS Build (free tier available, runs in the cloud):

```bash
npx eas-cli@latest build --platform android --profile preview   # gives you an .apk
npx eas-cli@latest build --platform ios                          # needs an Apple developer account
```

A release build should point at an **https** backend. To use a plain `http://`
address in an Android release build, add the `expo-build-properties` plugin with
`"android": { "usesCleartextTraffic": true }` in `app.json`.

# Lock In — a daily challenge & habit tracker

A small, offline-first mobile app for running a personal challenge (e.g. a "30-day lock-in"):
pick a handful of daily habits, check them off each day, and watch your streaks and a
calendar of "perfect days" build up over time. Each day also shows a rotating intention
prompt and a free-text journal space.

Built with **Expo / React Native** so the same codebase runs on iOS, Android, and the web.

## What it does

- **Set up a challenge** — name it, choose a length (1–365 days), and list the daily habits you want to keep.
- **Daily dashboard** — tap pastel tiles to mark each habit done; a hero banner shows your current streak, a progress bar, and how many perfect days you've logged.
- **Per-habit and overall streaks** — streaks are computed from your log, and newly added habits count from the day you add them so past streaks stay intact.
- **Journey calendar** — a dot grid of every day, colour-coded full / partial / missed; tap any past day to review or back-fill it.
- **Daily intention + journal** — a rotating prompt for each day plus a note field saved per day.
- **Fully local** — all data is stored on-device via AsyncStorage. No account, no backend, no network calls.

## How it's built

```
App.tsx          Root UI — Setup and Dashboard screens, all styling
src/storage.ts   Data model (Challenge/Habit), persistence, streak + status logic
src/tasks.ts     The rotating list of daily intention prompts
src/HabitList.tsx Reusable editable habit-row list (used in setup and edit modes)
src/theme.ts     Colours, fonts, radii, shadows — the single source of visual truth
```

- **Stack:** Expo SDK 58, React Native 0.88, React 19, TypeScript.
- **State:** plain React `useState` + `useEffect`; the whole challenge is one serializable object.
- **Persistence:** `@react-native-async-storage/async-storage`, with a built-in `v1 → v2`
  migration so older single-habit data is upgraded on load.
- **Logic is pure and separated from UI:** `storage.ts` exposes pure functions
  (`toggleHabit`, `dayStatus`, `overallStreak`, `habitStreak`, `fullDaysCount`) that take a
  `Challenge` and return derived values or a new `Challenge`. The UI just renders them.
- **Design:** Playfair Display + DM Sans via `@expo-google-fonts`, a warm pastel palette, a
  masonry tile layout, and gradient hero — all centralised in `theme.ts`.

### Run it locally

```bash
npm install
npm run web      # open in a browser
npm run ios      # iOS simulator (needs Xcode)
npm run android  # Android emulator
```

Lint / typecheck: `npx expo lint` and `npx tsc --noEmit`.

## How it can scale

The app is intentionally local-first and single-user today. Paths to grow it:

- **Cloud sync & multi-device:** replace the AsyncStorage layer in `storage.ts` with a sync
  adapter (e.g. Supabase / Firebase). Because all reads/writes already go through a thin set
  of `load/save/clear` functions, only that module changes — the UI and logic stay the same.
- **Multiple concurrent challenges:** the data model is already one `Challenge` object; lift it
  to a `Challenge[]` keyed by id and add a picker. Streak/status functions are per-challenge
  and need no change.
- **Social / accountability:** with a backend in place, add friends, shared challenges, and
  streak leaderboards — the per-habit and overall streak functions are the natural API surface.
- **Reminders:** add `expo-notifications` to nudge users on days with unchecked habits.
- **Distribution:** ship via EAS Build / EAS Update for over-the-air releases without app-store
  round-trips, and the existing web target can be deployed as a PWA.
- **Scale of data:** the log is O(days × habits) and trivially small per user; a real backend
  would shard by user id, so horizontal scaling is a non-issue for this workload.

## License

MIT — see [LICENSE](LICENSE).

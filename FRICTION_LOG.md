# RoutineGuard — Development Friction Log

These entries record issues actually encountered while building this project. They are not claims about Amazon products or services.

## 1. Git ignore rule hid application source

- **Task:** Publish the JavaScript routine engine with the web app.
- **Expected:** `git add web/src/lib/routine-engine.mjs` would stage the engine.
- **Actual:** Git ignored the path because the repository-root `.gitignore` contained a broad `lib/` rule. `git check-ignore -v` identified the exact rule.
- **Impact:** The web app and tests were published without the engine source, making a clean clone incomplete.
- **Workaround:** Changed the rule to `/lib/` and explicitly staged the engine.
- **Suggested improvement:** Developer setup guidance should warn that unanchored directory patterns can ignore nested application source. A pre-push check could verify that critical imported files are tracked.
- **Severity:** High for project reproducibility.

## 2. React lint rejected session-history restoration

- **Task:** Run `npm run lint` before committing a tested change.
- **Expected:** The existing browser-session history code would pass lint.
- **Actual:** ESLint reported `react-hooks/set-state-in-effect` at the session-storage hydration statement and an unused navigation parameter.
- **Impact:** Tests and production build passed, but the lint gate failed.
- **Workaround:** Added a narrowly scoped lint directive documenting intentional storage hydration and removed the unused navigation parameter.
- **Suggested improvement:** Error output could better distinguish intentional external-state hydration from avoidable cascading renders, with a migration example.
- **Severity:** Medium.

## 3. PowerShell relative-path script failed

- **Task:** Apply a small lint fix from PowerShell.
- **Expected:** The relative path `.\src\app\page.tsx` would resolve to the application file.
- **Actual:** .NET reported a path under `C:\Users\Jagan\src\app\page.tsx`; the file read failed and subsequent operations received a null value.
- **Impact:** The scripted edit did not occur on the first attempt.
- **Workaround:** Switched to an explicit project path with `Join-Path`, verified it with `Test-Path`, and only then read and wrote the file.
- **Suggested improvement:** Windows scripting examples should resolve file paths from a verified project root and stop immediately when file reads fail.
- **Severity:** Medium.
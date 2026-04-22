# Local Recovery and State Reference

Updated: 2026-03-26

## Why this file exists
- Keep a quick checklist for the "localhost suddenly stopped working / files look missing" scenario.
- Preserve a local reference point for the current working state before any future risky changes.

## Incident Pattern To Check First
- Symptom: `npm run dev` fails with `ENOENT ... package.json`.
- Symptom: project folder appears to contain only `.vite` or a partial set of files.
- Symptom: `localhost:5173` is up but serves empty/incorrect responses.

## First-Response Checklist (run these first)
1. Confirm you are in the expected folder:
   - `pwd`
   - `ls -la`
2. Confirm project essentials exist:
   - `ls -la package.json src public`
3. Check for stale process on `5173`:
   - `lsof -nP -iTCP:5173 -sTCP:LISTEN`
4. Restart dev server cleanly:
   - `npm run dev -- --host localhost --port 5173`

## If project files look missing
- Stop making further edits immediately.
- Verify neighboring directories to confirm whether a folder move/rename happened.
- Restore expected project path first, then restart Vite.

## Current Local State Marker
- Base commit at HEAD: `17a9b32`
- Current local modifications expected:
  - `src/App.tsx` (login view, smooth scroll/fade/timer display, collapsed-title auto-centering, etc.)
  - `public/assets/video/Placeholder-SalesDemo-Content_Compresssed.mp4`

## Quick Re-Verification Commands
- `npm run build`
- `curl -I http://localhost:5173/`
- `curl -I http://localhost:5173/assets/video/Placeholder-SalesDemo-Content_Compresssed.mp4`

## Notes
- Keep this file local as an operations reference.
- Update this file whenever the "known good" local state changes significantly.

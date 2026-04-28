# Integration notes — KERV theme adoption in this project

**Status:** Kit dropped in pristine on 2026-04-27. **Not yet installed or wired.**
**Audience:** Whoever decides whether/when to integrate the KERV theme into the prototype.

---

## TL;DR

The kit is the right design system to adopt long-term. There are three ways to do it, with different version trade-offs:

| Path | Effort | Risk | Best when |
|---|---|---|---|
| **A. Install as-is, ignore peer warnings** | Low (~30 min) | Low–Medium | You want the kit's tokens + components now without disturbing React/MUI versions |
| **B. Pin to kit's required versions** | High (1–2 days) | Medium | You want a clean install matching every peer constraint |
| **C. Copy theme values into local `src/theme/`** | Low (~1 hour) | Lowest | You don't want a package boundary; just adopt the design tokens |

**My recommendation:** Path A. The kit's code uses APIs stable across MUI 6 and 7, and across React 18 and 19. Peer warnings are noisy but functional.

---

## Version compatibility — what's actually different

| Dependency | Kit declares | This project has | Drift |
|---|---|---|---|
| `react` | `^19.0.0` (peer) | `^18.3.1` | Major behind |
| `react-dom` | (implied via React) | `^18.3.1` | Major behind |
| `@mui/material` | `^6.4.0` (dep) | `^7.3.9` | Major **ahead** |
| `@emotion/react` | `^11.14.0` (peer) | `^11.14.0` | Match ✓ |
| `@emotion/styled` | `^11.14.0` (peer) | `^11.14.1` | Match ✓ |
| `@types/react` | `^19.0.0` (devDep) | `^18.3.3` | Major behind |
| `typescript` | `~5.6` (recommended) | `~5.5.3` | Minor behind |

### Why these likely don't actually matter for runtime

The kit's source code uses these APIs:

- `createTheme`, `Theme` from `@mui/material/styles` — **stable across MUI 5, 6, and 7**
- `Box`, `BoxProps`, `useTheme` — **stable**
- All component override targets (`MuiButton`, `MuiDialog`, `MuiTable`, etc.) — **stable, same shape in 6 and 7**
- Module augmentation `declare module '@mui/material/styles' { … }` — **same hook in both major versions**
- Standard React function components, no React 19-specific features (no Actions, no `useFormStatus`, no Server Components, no React Compiler hints)

The peer dep declarations are KERV's "officially supported" matrix. The actual API surface used by the kit is conservative.

### What might break in practice

- **TypeScript types.** `@mui/material@7` and `@types/react@18` types may have subtle conflicts with the kit's MUI 6-aligned augmentations. If `tsc --noEmit` errors after install, this is the most likely cause.
- **Visual fidelity.** A few component overrides target CSS class names that MUI 7 may have renamed. The kit's `.MuiInputBase-sizeSmall` selectors and `MuiTable` overrides are the highest-risk areas. **Visual regression is the test that matters.**
- **Open Sans not loading.** The kit's typography expects Open Sans. Until the `<link>` tag is added to `index.html`, all components will render with the project's current Roboto.

### What absolutely won't break

- `theme.palette.primary.main = '#ED005E'` — same value the project already uses.
- `theme.customBackground.gradient` — pure string, framework-agnostic.
- Glass / gradient component visuals via `AppShell` and `GlassSection` — pure CSS, works on any MUI/React combination.

---

## Path A — Install as-is (recommended)

Steps if/when this is greenlit:

1. **Add the dependency:**
   ```bash
   npm install ./kerv-one-theme --legacy-peer-deps
   ```
   `--legacy-peer-deps` suppresses the React 19 / MUI 6 peer warnings. (Without it, npm 7+ refuses to install on peer mismatch by default.)

2. **Add Open Sans to `index.html`:**
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
   ```

3. **Wrap the app in `main.tsx`:**
   ```tsx
   import { ThemeProvider } from '@mui/material/styles'
   import CssBaseline from '@mui/material/CssBaseline'
   import { theme } from '@kerv-one/theme'

   <ThemeProvider theme={theme}>
     <CssBaseline />
     <App />
   </ThemeProvider>
   ```

4. **Replace inline `#ED005E` literals** with `theme.palette.primary.main` references. The MUI audit in `DESIGN_SYSTEM.md` lists all 27 usages.

5. **Replace the inline gradient** in `App.tsx` (the `linear-gradient(125deg, #f6f6f6 ...)` background on the outer `<Box>`) with `<AppShell>`.

6. **Optional, later:** replace `<Paper>` containers that should look glassy (login surface, dialog content) with `<GlassSection>`.

7. **Verify:**
   - `npx tsc --noEmit` — clean. Address any type errors at this gate, not after.
   - `npm run build` — clean.
   - Click through the demo. Open every dialog. Confirm the magenta is identical, the gradient looks right, and Open Sans is rendering.

### Risks specific to Path A

- **Peer warnings on every `npm install`.** Cosmetic; doesn't break anything. Your engineers will see them.
- **TypeScript may flag the kit's module augmentation.** Mitigation: ensure `tsconfig.json` has `"skipLibCheck": true` (it should already; verify).

---

## Path B — Migrate the project to React 19 + MUI 6

Only worth it if you have a separate reason to upgrade React 19, OR if Path A's TypeScript issues turn out to be unfixable.

### React 18 → 19 considerations

- React 19 was a major release. **Most code keeps working.** The notable changes:
  - `forwardRef` is still supported, but ref-as-prop is the new pattern. Existing `forwardRef` calls keep functioning.
  - `useFormStatus`, Actions, and the React Compiler are **opt-in additions**, not behavior changes.
  - StrictMode now double-invokes more effects in dev mode. Worth verifying playback timing isn't sensitive to this.
- Vite's `@vitejs/plugin-react` works on both React 18 and 19.

### MUI 7 → 6 considerations

- This is a **downgrade**, not a typical upgrade direction. Most engineers expect to move forward.
- MUI 7 removed deprecated APIs that MUI 6 still has — going to 6 means re-introducing those legacy paths. Not a big deal for this project, but worth noting.
- The Grid component shape is slightly different between 6 and 7. The current code doesn't use `Grid` heavily, so this is low-impact.

### Effort

- React 19 upgrade: 2–4 hours of testing across the full demo.
- MUI 7 → 6: 1–2 hours.
- Total: ~half a day with verification.

---

## Path C — Copy theme values into the project

If you want the design system without the package boundary:

1. Create `src/theme/` and copy `theme.ts` content into it (rename the file, keep it identical).
2. Copy `AppShell.tsx` and `GlassSection.tsx` into `src/components/primitives/`.
3. Update imports throughout the project to reference `src/theme` instead of `@kerv-one/theme`.
4. **Don't install the kit folder; delete it from the project root.**

Trade-off: future kit updates (when KERV iterates the design system) require manually re-copying. With Paths A or B, `npm install ./kerv-one-theme` after KERV updates the folder picks up changes automatically.

---

## What's deferred regardless of path

- Replacing the project's existing `src/demo/styles.ts` tokens with theme references is a **migration** task that happens after the theme is installed/copied. Estimate: 2–3 hours of mechanical replacements; safe because each replacement is one-for-one.
- The `<DialogTitleBar>`, `<PanelHeader>`, etc. primitives noted in `RESTRUCTURING_PLAN.md` Phase 4 still need to be built — the kit doesn't include them.

---

## My specific recommendation

Adopt via **Path A** as the new Phase 1 of `RESTRUCTURING_PLAN.md`. Sequence:

1. `npm install ./kerv-one-theme --legacy-peer-deps`
2. Add Open Sans to `index.html`
3. Wire `<ThemeProvider>` in `main.tsx`
4. Click through the demo to confirm nothing visually regressed
5. **Stop and review with the user.** Don't immediately start replacing `#ED005E` literals.

Doing 1–4 takes about an hour. The migration of inline literals is its own task and can be incremental — engineers can replace them as they touch each component.

---

## What I did NOT do tonight

- Did not run `npm install ./kerv-one-theme`. That modifies `package.json` + `package-lock.json` and risks visual regression I can't verify without your eyes.
- Did not modify the kit's peer dependencies. The kit ships exactly as KERV provided it.
- Did not wire `ThemeProvider` in `main.tsx`. That's a runtime-affecting change and should land with you watching.
- Did not import `theme`, `AppShell`, or `GlassSection` anywhere in `src/`. The kit is fully isolated until you decide.

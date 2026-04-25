# KERV Sales Demo Prototype

Interactive React + MUI prototype of the KERV sales demo experience. The app walks a sales team through:

- login / authenticated shell
- content selection grid
- demo playback with synchronized Taxonomy, Product, and JSON side panels
- expanded-panel dialogs (multi-select Taxonomy, full-catalog Products, JSON)
- profile drawer + email verification flow
- the protected `Exact Product Match` + `Sync: Impulse` ad-break behavior

This repo is the *prototype* build. A later production build will source media
from S3/CloudFront and hook authentication into AWS Cognito — see
[Future Migration Notes](#future-migration-notes) below.

## Stack

- React 18 + TypeScript (strict)
- Vite 5
- MUI 7 + Emotion

## Run Locally

```bash
npm install
npm run dev
```

Dev server: <http://localhost:5173/>

Scripts:

| Command           | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `npm run dev`     | Vite dev server with HMR                              |
| `npm run build`   | `tsc -b` + production Vite build (emits to `dist/`)   |
| `npm run preview` | Preview the production build locally                  |
| `npm run lint`    | ESLint across the repo                                |

## Project Structure

Everything demo-related lives inside `src/demo/` as a single feature module,
organized by role (components / hooks / data / utils). Global app glue stays at
`src/` root.

```text
src/
  App.tsx                     # top-level app orchestration + routing
  main.tsx                    # React entry
  index.css                   # global base styles
  vite-env.d.ts

  demo/
    constants.ts              # option lists, timing values, URLs, defaults, credentials
    styles.ts                 # shared MUI `sx` tokens + player control helpers
    types.ts                  # shared TypeScript types

    components/               # all UI components (views, dialogs, drawers)
      AuthenticatedHeader.tsx
      CompanionDialog.tsx
      ContentSelectionView.tsx
      DemoView.tsx            # the main playback surface
      ExpandedPanelDialog.tsx # fullscreen Taxonomy / Product / JSON dialogs
      JsonDownloadDialog.tsx
      LoginView.tsx
      PanelGlyph.tsx          # shared expand/collapse glyph
      ProfileDrawer.tsx
      SelectorDialog.tsx
      VerifyEmailDialog.tsx

    hooks/
      useDemoPlayback.ts      # timing, panel sync, ad-break & scrub logic

    data/                     # fixtures + real content JSON (bundled)
      adFixtures.ts
      ad-compliance-results-impulse.json
      ad-compliance-results-l-bar.json
      ad-compliance-results-sync.json
      contentItems.ts
      dhyhScenes.ts           # remaps upstream DHYH JSON onto the spliced clip timeline
      sceneMetadata.ts        # mock scenes for non-DHYH content tiles
      taxonomySceneData.ts    # shapes scenes into taxonomy panel content
      dhyh/
        tier1.json            # Basic Scene (IAB + Sentiment)
        tier2.json            # Advanced Scene
        tier3.json            # Exact Product Match

    utils/
      formatTime.ts           # mm:ss formatter
      jsonExport.ts           # JSON payload + download builders
      sessionStorage.ts       # persisted view/content/tier across refresh

public/
  assets/
    ads/                      # ad creatives (mp4 + png targets)
    elements/                 # shared UI SVGs (panel glyphs, dividers, placeholders)
    posters/                  # content tile poster art
    products/homedpt/         # product SKU imagery
    video/                    # main content videos
    kerv-logo.svg
    login-hero.png
```

### Where to make changes

| Change                                             | Touch                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| App routing / view switching / global state        | `src/App.tsx`                                                           |
| Playback timing, ad breaks, panel sync, scrubbing  | `src/demo/hooks/useDemoPlayback.ts`                                     |
| New UI view / dialog                               | `src/demo/components/` + wire from `App.tsx`                            |
| Shared styling tokens                              | `src/demo/styles.ts`                                                    |
| New content tile                                   | `src/demo/data/contentItems.ts` (+ poster under `public/assets/posters`)|
| Replace / update DHYH content JSON                 | `src/demo/data/dhyh/tier{1,2,3}.json`                                   |
| Taxonomy display logic                             | `src/demo/data/taxonomySceneData.ts`                                    |
| JSON download/export format                        | `src/demo/utils/jsonExport.ts`                                          |
| Timing / defaults / credentials                    | `src/demo/constants.ts`                                                 |

## Environment Variables

Every media URL resolves through a `VITE_*` override before falling back to the
committed default under `public/assets/`. This keeps the repo and the Vercel
build lean while letting individual machines (and a later S3/CloudFront deploy)
point the player at higher-fidelity or hosted files without any code change.

To override locally:

1. Copy `.env.example` → `.env.local` (gitignored).
2. Uncomment the keys you want to override.
3. Restart `npm run dev`.

Example for the full-quality 44-minute DHYH source:

```bash
# .env.local
VITE_DHYH_VIDEO_URL=/assets/video/dhyh-cmp-full.mp4
VITE_DHYH_VIDEO_SOURCE_OFFSET_SECONDS=1080
```

All documented keys live in `.env.example`; all defaults live in
`src/demo/constants.ts`.

## Login Credentials (prototype)

The sign-in form autofills the only valid credential pair. Editing either
field away from these values is rejected client-side:

- Email: `user@kerv.ai`
- Password: `SalesDemoTest`

Both values live in `src/demo/constants.ts` (`DEMO_LOGIN_EMAIL`,
`DEMO_LOGIN_PASSWORD`). This will be replaced by real auth in the production
build — see below.

## Deployment (Vercel)

The app is a static Vite build; no server runtime is required.

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`
- Node version: 18+ (Vite 5 requirement)

Because the app has no client-side router, SPA fallback rewrites are not
needed; a single `index.html` at `/` is sufficient.

### Pre-push sanity

Before every deploy, run locally:

```bash
npm run build   # tsc + vite; must be clean
npm run lint    # optional but recommended
```

Any asset referenced from code but missing from `public/assets/` will still
build but fail at runtime — do a quick smoke of the demo playback screen in
`npm run preview` before shipping.

## Asset Hygiene

- Anything not used by the shipped app stays out of git.
  See `.gitignore` and `.cursor/rules/no-backup-artifacts.mdc`.
- Backup/temp files follow the `*.backup.*` naming convention and are
  automatically ignored (e.g. `public/assets/login-hero.backup.png`,
  `src/demo/data/dhyh/tier1.backup.json`).
- The full 44-minute DHYH source (`public/assets/video/dhyh-cmp-full.mp4`)
  and the L-bar ad cut are too large for GitHub and are gitignored — use
  `VITE_DHYH_VIDEO_URL` overrides locally.

## Protected Behaviors

Touch these with extra care; they're what the sales team actually demoes:

- `Tier = Exact Product Match` + `Ad Playback = Sync: Impulse` on DHYH — this
  enables the two-segment spliced playback (source `19:45–21:32` + `35:45–44:00`)
  with the ad break at clip time `1:47`.
- Panel scroll behavior (`src/demo/hooks/useDemoPlayback.ts` →
  `applyScroll`). One rule governs everything:
  - **Smooth scroll is reserved for natural playback drift only.**
  - Any other cause of the computed target moving – taxonomy switch,
    tier/content swap, scene reindex, ad-break flip, panel re-open, window
    resize, slider scrub, etc. – produces a frame-over-frame target
    discontinuity and is handled by a single snap rule in `applyScroll`
    (`TARGET_JUMP_THRESHOLD_PX`). No enumerated list of triggers, no
    whack-a-mole. If you find a new case where the panel does an
    "aggressive scroll" instead of a snap, the fix is almost always a bug
    in how the target is being computed – don't add another explicit snap
    flag unless there's no alternative.
  - Manual scroll pauses auto-scroll for *that* panel only
    (`PANEL_MANUAL_SCROLL_PAUSE_MS = 5000ms`), then snap-loads back to live
    via `needsSnapOnResume`.
  - Slider scrub additionally triggers `flagPanelScrub()` as a belt-and-
    suspenders signal (covers the rare case where a slow drag produces
    sub-threshold target deltas).
- Product panel segmentation: pre-ad and post-ad product lists are independent.
  The collapsed inline panel only shows the segment you're in; the expanded
  dialog shows everything across both segments.

## Future Migration Notes

This build intentionally keeps integrations thin so the later production build
can swap them out cleanly:

- **Auth**: the `handleLogin` branch in `App.tsx` is the only place that decides
  authenticated vs unauthenticated. Replace the hardcoded check against
  `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` with a Cognito session check.
- **Media & data hosting**: every media URL is an env-override (`VITE_*`) with
  a local fallback. Point the `VITE_*` keys at your S3/CloudFront origins at
  build time and nothing else needs to change. The DHYH tier JSONs are
  dynamically imported in `dhyhScenes.ts` — replace that dynamic import with
  a `fetch()` against S3 when you're ready to stop bundling them.
- **Persisted session**: `src/demo/utils/sessionStorage.ts` is the only
  `localStorage` surface today. Swap for a real session store without touching
  the rest of the app.

## Handoff Notes

- Keep `App.tsx` thin — it's orchestration, not behavior.
- New UI belongs in `src/demo/components/`.
- New derived state or playback behavior belongs in
  `src/demo/hooks/useDemoPlayback.ts`.
- New fixtures / content belong in `src/demo/data/`.
- If you change the folder layout, update this README in the same PR.

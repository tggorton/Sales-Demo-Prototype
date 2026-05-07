---
name: add-new-ad-playback-mode
description: End-to-end recipe for adding a new ad-playback mode (e.g. Pause Ad, Carousel Shop, Companion, future modes) to the Sales Demo Tool. Covers registry wiring, per-content data, runtime gating, JSON-panel injection, optional UI surface, and tier availability. Use whenever the user asks to add, enable, or scaffold a new mode that isn't already in `src/demo/ad-modes/modes/`.
---

# Skill: `/add-new-ad-playback-mode`

Stand up a new ad playback mode end-to-end. Modes are the dropdown values
the user picks in the playback bar — each one is a self-contained slice of
behaviour the demo runs while it's active. This skill is the canonical
recipe; follow it whenever you're scaffolding a new mode (or enabling a
previously-disabled stub).

## When to invoke this skill

- The user asks for a new ad-playback mode — by name ("add a new Pause Ad
  mode") or by behaviour ("I want a mode that shows X when the user does Y").
- A previously-disabled stub (`enabled: false`) needs to come online.
- A mode's behavioural surface area expands enough that a clean re-scaffold
  is faster than patching the existing path.

## Mental model — what a "mode" actually is

A mode binds together:

1. **An id** — the dropdown string (`'Pause Ad'`, `'Sync: L-Bar'`, etc.). Lives
   in the `AdPlaybackOption` union in [`src/demo/types.ts`](src/demo/types.ts).
2. **Mode CODE (content-agnostic)** — config metadata, optional UI components,
   optional logic. Lives under [`src/demo/ad-modes/modes/<mode-id>/`](src/demo/ad-modes/modes/).
3. **Mode DATA (per-content)** — JSON the mode reads at runtime. Lives under
   [`src/demo/content/<content-id>/ads/<mode-id>.json`](src/demo/content/dhyh/ads/).
   Every content carries its own copy.
4. **Static media (per-content)** — images, videos, sponsor logos. Lives under
   `public/assets/` with the `<content-id>-` filename prefix (e.g.
   `public/assets/ads/dhyh-pause-ad.png`).
5. **Runtime gating** — when the mode is "active", driven by
   [`useDemoPlayback`](src/demo/hooks/useDemoPlayback.ts).
6. **UI surface (optional)** — a component the player renders while the mode
   is active. May reuse an existing component (CTA Pause + Organic Pause share
   `<PauseOverlay>`) or add a new one (Pause Ad has its own `<PauseAdOverlay>`).
7. **JSON-panel injection (usually)** — most modes surface their compliance /
   data payload in the JSON panel while the mode is active. Add a branch in
   [`DemoView.tsx`](src/demo/components/DemoView.tsx)'s JSON-panel ternary.
8. **Tier availability (per-content)** — which tiers expose the mode. Lives
   in each content's [`config.ts`](src/demo/content/dhyh/config.ts) under
   `defaultAdModes` (covers fallback tiers) + `adModesByTier` (overrides).

## What this skill does

The recipe below is sequenced so each phase compiles cleanly on its own. Run
`npm run build` + `npx vitest run` after every phase. The pre-push hook
([`.githooks/pre-push`](.githooks/pre-push)) will catch `tsc -b` failures
before the push, but checking earlier saves time.

### 1. Confirm the mode id

Pick the dropdown string. Convention: human-readable, mixed-case, prefixed
when grouped (`'Sync: L-Bar'`, `'Sync: Impulse'`). Add it to the
`AdPlaybackOption` union in [`src/demo/types.ts`](src/demo/types.ts) if it's
not already there. Most "new" modes already exist as disabled stubs in the
type — flip `enabled: false` to `enabled: true` in step 2 and you're done at
the type level.

### 2. Wire the mode config

Path: [`src/demo/ad-modes/modes/<mode-id>/config.ts`](src/demo/ad-modes/modes/).

Most stubs already exist with `enabled: false` and no fields. Edit:

- Set `enabled: true`.
- Import any per-content JSON the mode needs (`fixtures` for compliance
  payload, etc.) from [`src/demo/content/dhyh/ads/<mode-id>.json`](src/demo/content/dhyh/ads/).
- Set the data fields the mode uses. Existing fields:
  - `dhyhAdDurationSeconds`, `dhyhAdVideoUrl`, `dhyhCompliancePayload` —
    populate for Sync-style ad-break modes.
  - `dhyhAdResponseLabel` — JSON-panel header for non-default modes.
  - `dhyhPauseAdImageUrl` — Pause Ad image creative.
- If the mode introduces a new field on `AdModeDefinition`, edit
  [`src/demo/ad-modes/types.ts`](src/demo/ad-modes/types.ts) to add it. Keep
  it optional (`?`) so existing modes don't need updating.

The mode is automatically registered in
[`src/demo/ad-modes/registry.ts`](src/demo/ad-modes/registry.ts) as long as
it was already imported there (every stub already is). If it's a brand-new id
(rare), add the import + entry.

### 3. Add the per-content JSON data

Path: [`src/demo/content/<content-id>/ads/<mode-id>.json`](src/demo/content/dhyh/ads/).

For DHYH the easiest start is to duplicate L-Bar's compliance JSON:
`cp src/demo/content/dhyh/ads/sync-lbar.json src/demo/content/dhyh/ads/<mode-id>.json`.
Edit the shape later when the partner supplies real data. The mode config
imports this file via a relative path (see `pause-ad/config.ts`).

### 4. Drop the static media

Path: [`public/assets/ads/<content-id>-<mode-id>.<ext>`](public/assets/ads/).

Use the `<content-id>-` prefix so DHYH-owned files are obvious in the global
`public/assets/` folder (per the per-content org rule in
[`src/demo/content/README.md`](src/demo/content/README.md)). Reference the
URL via `envString('VITE_DHYH_<MODE>_<KIND>_URL', '/assets/ads/dhyh-<mode-id>.<ext>')`
so a future CDN flip is one env-var change.

### 5. Add runtime gating to the playback hook

Path: [`src/demo/hooks/useDemoPlayback.ts`](src/demo/hooks/useDemoPlayback.ts).

Add a block alongside the existing pause-mode gating (search for
`isPauseOverlayActive`). Each new mode typically needs:

- An `is<Mode>Active: boolean` derived from `selectedAdPlayback === '<mode>'`
  + any mode-specific conditions (e.g. `hasStartedPlayback`, `!isVideoPlaying`,
  time-window checks, dismiss flags).
- Any per-mode payload selectors (`<mode>ImageSrc`, `<mode>CompliancePayload`,
  etc.) sourced from the active mode's registry entry.
- A dismiss state if the mode supports closing without resuming playback. Use
  `useState(false)` + a `useCallback` setter, plus a `useEffect` that resets
  on resume / mode change / content change. See `isPauseAdDismissed` for a
  reference implementation.
- Return all new fields from the hook so they reach `App.tsx`.

### 6. Plumb props through App → DemoView → VideoPlayer

Each new field added in step 5 flows through:

- [`src/App.tsx`](src/App.tsx) — pass `demoPlayback.<field>` to `<DemoView>`.
- [`src/demo/components/DemoView.tsx`](src/demo/components/DemoView.tsx) — add
  to the `DemoViewProps` type, destructure in the function args, pass forward
  to `<VideoPlayer>`.
- [`src/demo/components/player/VideoPlayer.tsx`](src/demo/components/player/VideoPlayer.tsx)
  — add to props type, destructure, render the UI surface.

### 7. Build the UI surface (optional but typical)

If the mode adds a visual surface to the player (overlay, banner, modal):

- Component path: [`src/demo/components/player/<ModeName>Overlay.tsx`](src/demo/components/player/)
  for player-area overlays, or
  [`src/demo/components/dialogs/<ModeName>Dialog.tsx`](src/demo/components/dialogs/)
  for modals.
- Render it inside `<VideoPlayer>` next to the existing `<PauseOverlay>` /
  `<PauseToShopCta>` blocks (around line 400).
- Render conditionally on the `is<Mode>Active` flag.
- Wrap in a positioning `<Box>` that respects `playerControlTokens.controlBarHeight`
  so the bottom controls stay clickable.
- Match the existing pause-overlay dim conventions:
  semi-transparent black backdrop (`rgba(0,0,0,0.5)` for ad-card surfaces,
  `rgba(0,0,0,0.32)` for carousel-style overlays).
- Use `opacity` toggling rather than mount/unmount so transitions animate
  cleanly in both directions.

### 8. Inject into the JSON panel (usually)

Path: [`src/demo/components/DemoView.tsx`](src/demo/components/DemoView.tsx).

The JSON panel has a ternary chain that picks which JSON to render. Add a new
branch ABOVE the existing CTA/Organic Pause and Sync ad-break branches if the
new mode should take precedence when active. Match the existing visual
treatment: magenta (`#F05BB8`) monospace JSON on the dark blue panel
background, with a thin label header above it (`color: '#d4deea'`,
`fontSize: 11`).

### 9. Add the mode to per-content tier availability

Path: [`src/demo/content/<content-id>/config.ts`](src/demo/content/dhyh/config.ts).

If the mode should appear on every tier, add the id to `defaultAdModes`. If
it's tier-exclusive, add it only to `adModesByTier['<Tier Name>']` and leave
`defaultAdModes` alone. The `getAvailableAdModes` resolver handles the rest.

Update [`tests/unit/getAvailableAdModes.test.ts`](tests/unit/getAvailableAdModes.test.ts)
to reflect the new gating — those tests pin the resolver's contract so a
silent regression can't drop the new mode.

### 10. Build + test gate

Run `npm run build` and `npx vitest run`. The pre-push hook will run the
build again on push, but verifying locally is faster.

If the user wants to verify visually, suggest starting `npm run dev` and
clicking through each tier of DHYH to confirm:
1. The new mode appears in the dropdown for the expected tiers (and only those).
2. Selecting it produces the expected behaviour at runtime.
3. The JSON panel renders the right payload while the mode is active.
4. Switching to another mode mid-session cleans up the new mode's UI.

## File paths (cookbook quick-reference)

- Mode types: [`src/demo/types.ts`](src/demo/types.ts) (`AdPlaybackOption`)
- Mode definitions type: [`src/demo/ad-modes/types.ts`](src/demo/ad-modes/types.ts) (`AdModeDefinition`)
- Mode configs: [`src/demo/ad-modes/modes/<mode-id>/config.ts`](src/demo/ad-modes/modes/)
- Registry: [`src/demo/ad-modes/registry.ts`](src/demo/ad-modes/registry.ts)
- Per-content JSON data: [`src/demo/content/<content-id>/ads/<mode-id>.json`](src/demo/content/dhyh/ads/)
- Static media: [`public/assets/ads/<content-id>-<mode-id>.<ext>`](public/assets/ads/)
- Runtime gating: [`src/demo/hooks/useDemoPlayback.ts`](src/demo/hooks/useDemoPlayback.ts)
- Prop plumbing: [`src/App.tsx`](src/App.tsx) → [`DemoView`](src/demo/components/DemoView.tsx) → [`VideoPlayer`](src/demo/components/player/VideoPlayer.tsx)
- UI surface: [`src/demo/components/player/<ModeName>Overlay.tsx`](src/demo/components/player/)
- JSON-panel branch: [`src/demo/components/DemoView.tsx`](src/demo/components/DemoView.tsx)
- Tier availability: [`src/demo/content/<content-id>/config.ts`](src/demo/content/dhyh/config.ts)
- Tier-availability tests: [`tests/unit/getAvailableAdModes.test.ts`](tests/unit/getAvailableAdModes.test.ts)

## Skill maintenance

When new architectural patterns emerge (e.g. modes that need their own
context provider, multi-content modes, modes that talk to a backend API),
add a new section here documenting the pattern. Don't bake project-specific
DHYH details into the generic recipe — those belong in DHYH's own configs /
JSONs / etc. The cookbook should remain content-agnostic.

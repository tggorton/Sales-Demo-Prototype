# `src/demo/ad-modes/`

Registry-driven configuration for every ad mode the demo knows about.

The registry is **the single source of truth**. Adding, enabling, or
modifying a mode means editing one folder under `modes/<id>/` plus one
entry in `registry.ts`. Consumers (the playback hook, the selector
dropdown) read from the registry — they never hardcode mode ids or
mode-specific constants.

## File map

```
src/demo/ad-modes/
├── README.md            (this file)
├── types.ts             AdModeDefinition shape + AdCompliancePayload type
├── registry.ts          AD_MODE_REGISTRY + ENABLED_AD_MODE_IDS + helpers
├── index.ts             barrel re-exports
└── modes/
    ├── sync/                ✅ enabled — 45s plain Sync
    │   ├── config.ts
    │   └── fixtures.json
    ├── sync-lbar/           ✅ enabled — 30s with L-bar overlay
    │   ├── config.ts
    │   └── fixtures.json
    ├── sync-impulse/        ✅ enabled — 30s with QR / companion
    │   ├── config.ts
    │   └── fixtures.json
    ├── pause-ad/            ⏸ disabled stub
    │   └── config.ts
    ├── cta-pause/           ⏸ disabled stub
    │   └── config.ts
    ├── organic-pause/       ⏸ disabled stub
    │   └── config.ts
    ├── carousel-shop/       ⏸ disabled stub
    │   └── config.ts
    └── companion/           ⏸ disabled stub
        └── config.ts
```

## How modes are wired today

`useDemoPlayback` calls `getAdMode(selectedAdPlayback)` and reads:

- `mode.dhyhAdDurationSeconds` — drives the scrubber's cyan ad slot
  length and the ad-break state machine
- `mode.dhyhAdVideoUrl` — sourced into the `<video>` element during the
  break
- `mode.dhyhCompliancePayload` — surfaces in the JSON panel during the
  break

`SelectorDialog` reads `ENABLED_AD_MODE_IDS` to populate the dropdown.
Disabled modes aren't shown.

Only modes where `enabled: true` AND `dhyhAdDurationSeconds` is set
trigger a sync ad break — the helper `isSyncAdBreakMode(id)` encodes
that rule.

## Recipe: enable an existing disabled mode

1. **Open the mode's config:** `src/demo/ad-modes/modes/<id>/config.ts`.
2. **Set `enabled: true`** and add the three DHYH-specific fields:
   ```ts
   dhyhAdDurationSeconds: 30,
   dhyhAdVideoUrl: envString('VITE_DHYH_<UPPER_ID>_AD_VIDEO_URL', '/assets/ads/<file>.mp4'),
   dhyhCompliancePayload: fixtures as Record<string, unknown>,
   ```
3. **Add the creative** to `public/assets/ads/<file>.mp4`. Confirm size
   is reasonable (HANDOFF.md §5 — anything > 10MB needs sign-off).
4. **Add the compliance JSON** as `modes/<id>/fixtures.json`.
5. **Run `npm run build`** — the dropdown will pick the mode up
   automatically because `ENABLED_AD_MODE_IDS` is derived.

If the mode introduces UI behavior that doesn't fit the existing
sync-ad-break pattern (e.g., `Pause Ad` shows a static image, `CTA Pause`
shows an in-content CTA overlay), you'll also need to add a new branch
in `DemoView.tsx` / `useDemoPlayback.ts`. That's a real component
extension; the registry handles the data, the components handle the UI.

## Recipe: add a brand-new mode

1. **Pick the id.** It becomes both the dropdown label and the registry
   key. Add it to `AdPlaybackOption` in `src/demo/types.ts` first.
2. **Create the folder:** `src/demo/ad-modes/modes/<id>/` (use kebab-case
   for the folder name to match the others).
3. **Add `config.ts`:**
   ```ts
   import { envString } from '../../../utils/env'
   import type { AdModeDefinition } from '../../types'
   import fixtures from './fixtures.json'

   export const newMode: AdModeDefinition = {
     id: 'New Mode',  // must match the AdPlaybackOption literal
     label: 'New Mode',
     enabled: true,
     dhyhAdDurationSeconds: 30,
     dhyhAdVideoUrl: envString('VITE_DHYH_NEW_MODE_AD_VIDEO_URL', '/assets/ads/your-file.mp4'),
     dhyhCompliancePayload: fixtures as Record<string, unknown>,
   }
   ```
4. **Add `fixtures.json`** in the same folder.
5. **Register it in `registry.ts`:**
   ```ts
   import { newMode } from './modes/<id>/config'

   export const AD_MODE_REGISTRY: AdModeRegistry = {
     // ... existing entries
     'New Mode': newMode,
   }
   ```
6. **Add the creative** to `public/assets/ads/`.
7. **Run the build** — Selector dropdown picks it up automatically.

## What the registry intentionally does NOT own

- **The companion / QR URL** for DHYH ad breaks. All sync modes share
  the same companion URL (`DHYH_IMPULSE_AD_COMPANION_URL` in `constants.ts`).
  If a future mode wants a different companion target, hoist that field
  into `AdModeDefinition` at that time.
- **The placeholder content's two-break ad imagery** (`AD_BREAK_*_IMAGE`,
  `AD_QR_*`). Those are content-level, not mode-level. They live in
  `constants.ts` and only the legacy non-DHYH path uses them.
- **The scrubber segments shape.** Computed in the playback hook from
  `dhyhAdDurationSeconds` because it depends on splice constants that
  are content-level, not mode-level.
- **Routing decisions like "does this mode show an in-content CTA?"**
  Those are still string compares in the hook (`shouldShowInContentCta`
  for `CTA Pause` / `Organic Pause`). When those modes are enabled, this
  is the next thing to clean up — likely by adding a `behavior` field to
  `AdModeDefinition`.

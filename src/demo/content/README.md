# `src/demo/content/` — per-content tile bundles

Every piece of content the demo can play lives at `src/demo/content/<id>/`
with everything it owns: tier JSONs, per-mode ad data, content-specific
timeline / config, and any generated review artifacts. Adding a new tile
is a self-contained directory drop, not a treasure-hunt across the
project.

## Mental model

> **Mode CODE is global** — `src/demo/ad-modes/modes/<mode-id>/` holds
> how a mode works (component, types, mode-level config). It never
> imports content-specific data files.
>
> **Mode DATA is per-content** — every content tile carries its own
> JSON for every ad mode it supports, named by mode-id. Adding Content
> #2 = `mkdir content/content2/` + drop in its own ads/tiers/etc.; the
> mode code doesn't change.

## Directory shape (current)

```
src/demo/content/<id>/
  config.ts          # ContentConfig — id, title, hidden taxonomies, ad-mode availability
  timeline.ts        # content-specific constants (splice points, ad-break time, etc.)
  scenes.ts          # tier-payload → SceneMetadata[] builder
  pauseMoments.ts    # adapter that wires this content's pause-mode JSONs into the player overlay
  tiers/
    tier1.json
    tier2.json
    tier3.json
  ads/               # this content's data for each ad mode, keyed by mode-id
    sync.json
    sync-lbar.json
    sync-impulse.json
    cta-pause.json
    organic-pause.json
    # pause-ad.json, etc. — one file per mode the content supports
  review/            # gitignored — one-off generated review artifacts (e.g. dhyh-products.json)
```

Folders only get created when they have something to hold. A future
`compliance/` (per-content IAB attestations) or `products/` (per-content
product overrides not derivable from tier JSONs) lands when the first
real file does — no scaffolded empties.

## Future shape (when Content #2 lands)

```
src/demo/content/
  index.ts                  # CONTENT_REGISTRY + getContentConfig + getAvailableAdModes
  dhyh/                     # current
    ads/, tiers/, review/, config.ts, timeline.ts, scenes.ts, pauseMoments.ts
  content2/                 # mirrors dhyh's shape with content2's data
    ads/, tiers/, review/, config.ts, timeline.ts, scenes.ts, pauseMoments.ts
```

## How the shell consumes a content tile

1. **Tier JSON** is loaded by `src/demo/sources/resolveTierPayload.ts` —
   bundled-import path is `'../content/<id>/tiers/tier{1,2,3}.json'`. Add
   the entry there when you add a new tile.
2. **Config** (`config.ts`) is registered in [`./index.ts`](./index.ts)'s
   `CONTENT_REGISTRY`. `useDemoPlayback` reads everything content-specific
   through `getContentConfig(id)` — it never imports a content's `config.ts`
   directly.
3. **Ad modes** for a given `(content, tier)` come from
   `getAvailableAdModes(id, tier)` in [`./index.ts`](./index.ts), which
   resolves `config.adModesByTier?.[tier] ?? config.defaultAdModes` and then
   filters against the globally-enabled set in `ad-modes/registry.ts`. A
   tier-exclusive mode (e.g. a future Tier-3-only `Carousel Shop`) is one
   `adModesByTier` entry — no code changes elsewhere.
4. **Mode data** for a given `(content, mode)` lives at
   `src/demo/content/<id>/ads/<mode-id>.json`. Each mode's `config.ts`
   imports the JSON it needs from there; pause-mode adapters live at
   `src/demo/content/<id>/pauseMoments.ts` because they wire the
   per-content JSON into a per-mode shape (CTA Pause + Organic Pause
   share the adapter today).

## Content × tier × ad-mode availability

`config.adModesByTier` is the slot for **per-tier** ad-mode overrides. Use
it when a content's tier offers a mode the other tiers don't:

```ts
export const exampleConfig: ContentConfig = {
  // ...
  defaultAdModes: ['Sync', 'Sync: L-Bar'],
  adModesByTier: {
    'Exact Product Match': ['Sync', 'Sync: L-Bar', 'Carousel Shop'],
  },
}
```

Tiers not listed in `adModesByTier` fall back to `defaultAdModes`. Modes
that are globally disabled in `ad-modes/registry.ts` are filtered out at
lookup time, so listing a not-yet-shipped mode here is safe — it'll start
showing up automatically the day the registry enables it.

## Why per-content `review/` instead of project root

Generated review artifacts (e.g. `dhyh-products.json`, derived from a tier
JSON for human review) used to sit at the project root, where they would
collide once a 2nd content tile arrived. Keeping them under each content's
`review/` subdirectory means future tiles never accumulate floating files
at the root, and the `.gitignore` rule
(`src/demo/content/*/review/`) cleanly covers every tile's review artifacts
in one line.

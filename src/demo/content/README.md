# `src/demo/content/` — per-content tile bundles

Every piece of content the demo can play lives at `src/demo/content/<id>/`
with everything it owns: tier JSONs, ad creatives + manifests, products,
compliance docs, generated review artifacts, and content-specific
timeline/config. Adding a new tile is a self-contained directory drop, not
a treasure-hunt across the project.

## Directory shape

```
src/demo/content/<id>/
  config.ts        # ContentConfig — id, title, hidden taxonomies, ad-mode availability
  timeline.ts      # content-specific constants (splice points, ad-break time, etc.)
  scenes.ts        # tier-payload → SceneMetadata[] builders (when content has its own logic)
  schema.ts        # Zod schema for tier JSON (added in Phase 5b once a 2nd tile exists)
  tiers/           # tier1.json, tier2.json, tier3.json
  ads/             # creatives + manifests scoped to this content (mirrors ad-modes/modes/* shape)
  products/        # per-content product overrides / curated lists
  compliance/      # per-content compliance JSON, IAB attestations
  review/          # gitignored — one-off generated artifacts (e.g. dhyh-products.json)
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

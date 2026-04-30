# `src/demo/sources/`

Pluggable resolution layer for **where the app pulls tier JSONs and product
images from** — local bundle today, S3 / CloudFront tomorrow, uploaded
content packages eventually. Both resolvers take a `contentId` so future
multi-content support routes the right files for the right content tile.

## Why this layer exists

Two consumers of external content data live in `src/demo/data/`:

- **Tier JSONs** (`tier1.json` / `tier2.json` / `tier3.json`) — the upstream
  model's per-scene analysis.
- **Product images** — the SKU thumbnails the Product panel renders.

Both used to be hardcoded against bundled local paths. This module makes
that point swappable so the team can:

1. Move tier JSONs + product images to S3 / CloudFront (production hosting).
2. Support **content uploads** — a future feature where users upload a zip
   package containing a new content tile's video + tier JSONs + ad creatives
   + product images, the backend extracts to S3 under a new `contentId`, and
   the app fetches that content's data through the same resolver layer.

The current build keeps using the bundled local paths by default — this is
purely an abstraction; no behavior change in production today.

## File map

| File | Purpose |
|---|---|
| `types.ts` | `ContentId`, `TierJsonPayload`, `ProductImageInput` types |
| `resolveTierPayload.ts` | Async tier JSON loader (remote fetch or bundled import) |
| `resolveProductImage.ts` | Sync product image URL resolver (remote URL or bundled path) |
| `index.ts` | Barrel re-export |

## How it's used

`src/demo/data/dhyhScenes.ts` calls both resolvers during bundle build:

```ts
import { resolveTierPayload, resolveProductImageUrl } from '../sources'

// Tier loading:
const payload = await resolveTierPayload('dhyh', selectedTier)

// Product image (during scene → SceneProduct mapping):
const url = resolveProductImageUrl('dhyh', { image, image_url })
```

## Switching to remote content (S3 / CDN)

Set the env override and rebuild — no code changes required:

```bash
# .env.local (or production deploy env)
VITE_CONTENT_SOURCE_BASE_URL=https://kerv-content.example.com
```

When set, the resolvers expect this directory structure under the base URL:

```
{base}/
└── {contentId}/             # e.g. dhyh/
    ├── tier1.json
    ├── tier2.json
    ├── tier3.json
    └── products/
        └── {image_path}     # e.g. homedpt/335027444.jpg
```

Tier JSONs are fetched on demand (per the existing tier-cache in
`dhyhScenes.ts → bundleCache`). Product images use the upstream JSON's
`image_url` field directly when set (it's already an absolute URL); the
`base + contentId + products/` path is the fallback for relative
`image`-only entries.

The bundled / local path remains the default; remote is opt-in. This lets
local dev keep working without configuring an S3 bucket.

## Adding a new content tile (bundled path)

For content the build ships with locally (no upload step), add a folder
and register a loader:

1. Create `src/demo/data/<contentId>/tier{1,2,3}.json` with the upstream
   payload.
2. Open `src/demo/sources/resolveTierPayload.ts`. Add an entry to
   `bundledTierLoaders`:
   ```ts
   const bundledTierLoaders = {
     dhyh: { ... },
     newContent: {
       'Basic Scene': () => import('../data/newContent/tier1.json').then(m => m.default ?? m),
       // ... etc
     },
   }
   ```
3. Drop the spliced video into `public/assets/video/` and ad creatives into
   `public/assets/ads/`.
4. Add a tile entry in `src/demo/data/contentItems.ts`.

## Future: content upload pipeline

The upload-feature pathway will look roughly like this. **Backend work and
UI design are out of scope for the current restructuring**; the source
resolver is what makes it possible from the app's side without further
refactoring:

```
[user] uploads zip
       │
       ▼
[backend] extracts + validates manifest
       │
       ▼
[backend] uploads to s3://kerv-content/<contentId>/
       │   ├── tier1.json
       │   ├── tier2.json
       │   ├── tier3.json
       │   ├── video.mp4
       │   ├── ads/<creative>.mp4
       │   ├── products/<image>.jpg
       │   └── manifest.json
       ▼
[backend] registers contentId in the manifest registry
       │
       ▼
[app] fetches manifest registry on startup, populates content tile catalog
       │
       ▼
[user] selects new content tile
       │
       ▼
[app] resolveTierPayload(contentId, tier) → fetches from S3
[app] resolveProductImageUrl(contentId, ...) → S3 URL or absolute image_url
```

The expected manifest fields (per content) — exact schema TBD by the team:

```jsonc
{
  "id": "newContent",
  "title": "Display Name",
  "categories": ["Reality TV", "..."],
  "splice": {
    "segmentASource": [1185, 1292],
    "segmentBSource": [2145, 2640],
    "adBreakClipSeconds": 107
  },
  "locationTimeline": [
    { "fromSec": 0, "location": "Construction Site", "confidence": 0.9 },
    /* ... */
  ],
  "hiddenTaxonomies": ["Brand Safety"],
  "ads": {
    "Sync": { "videoUrl": "ads/sync.mp4", "durationSeconds": 45, ... },
    /* per ad mode */
  }
}
```

That manifest shape directly mirrors what currently lives in
`src/demo/constants.ts` (DHYH_*) + `src/demo/ad-modes/modes/*/config.ts`.
The content-tile pattern (Phase 5 in `RESTRUCTURING_PLAN.md`) is where the
manifest-driven config layer would land — it's deliberately deferred until
a second piece of content is on the roadmap, since speculative abstraction
without a real second use case usually gets the abstraction wrong.

## Constraints

- The resolver only validates that a fetch succeeds (status 200) — it does
  not parse the JSON shape. Downstream `buildBundle` is the parser.
- `image_url` (when present) is preferred in remote mode because it's
  already an absolute URL the CDN serves directly; building
  `${base}/${contentId}/products/...` only fires for the small set of
  product entries where `image_url` is missing.
- The default (no env var) preserves bundled-local behavior exactly — the
  app continues to ship product images and tier JSONs in `public/assets/`
  and `src/demo/data/` until a deploy explicitly opts into remote.

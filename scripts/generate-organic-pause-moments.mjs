// Generate `src/demo/content/dhyh/organic-pause-moments.json` from
// the Tier 3 source-time scene metadata. Run once whenever the Tier 3
// data changes:
//
//     node scripts/generate-organic-pause-moments.mjs
//
// What it does
// ────────────
// Tier 3 (`tiers/tier3.json`) carries scene-by-scene product metadata
// against the original 44-min source-time axis. The Organic Pause
// overlay needs the same shape we use for CTA Pause
// (`pause-moments.json` — campaign + theme + scenes + objects +
// product_match) but on the spliced 10:02 clip-time axis. This script
// is the conversion bridge.
//
// Steps:
//   1. Filter Tier 3 scenes to ones with at least one product_match.
//   2. Drop scenes whose source-time falls outside Segment A or B.
//   3. Re-anchor each kept scene's start/end onto the clip timeline.
//   4. Walk products in clip-time order and build a deduped flat
//      list — same 90-s dedupe window the Products panel uses
//      (`buildProductEntries` in `src/demo/utils/productEntries.ts`).
//      A product that appears within 90 s of its previous emission
//      is collapsed; gaps larger than that let it reappear naturally.
//   5. For each scene-with-products at clip-time T, the moment's
//      carousel shows the 5 MOST RECENT deduped products with
//      `sceneStart <= T` (trailing-5 rolling window). This mirrors
//      the Products-panel feel where the active product anchors the
//      list and recent products are nearby. Early scenes show
//      whatever subset is available (1–4 products).
//   6. Image URLs use the bundled-asset path (`/assets/products/...`)
//      so images load instantly from `public/assets/products/` —
//      same source the Products panel uses. The S3 `image_url` field
//      is intentionally NOT used here (CORS / latency).
//   7. `qr` carries the product `link` URL so the click-out works
//      even though we render a placeholder-style QR visually.
//   8. Emit a single JSON file with the same theme block as
//       `pause-moments.json` so both modes share campaign assets.
//
// Why a script (not runtime computation)
// ──────────────────────────────────────
// The output is bundled at build time alongside `pause-moments.json`,
// keeps the runtime simple, and produces a diffable artefact when
// the upstream Tier 3 data changes.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const TIER3_PATH = join(ROOT, 'src/demo/content/dhyh/tiers/tier3.json')
const PAUSE_MOMENTS_PATH = join(ROOT, 'src/demo/content/dhyh/pause-moments.json')
const OUT_PATH = join(ROOT, 'src/demo/content/dhyh/organic-pause-moments.json')

// DHYH splice constants (mirror `src/demo/content/dhyh/timeline.ts`).
const SEG_A_SOURCE_START = 19 * 60 + 45 // 1185s
const SEG_A_SOURCE_END = 21 * 60 + 32 //   1292s
const SEG_A_DURATION = SEG_A_SOURCE_END - SEG_A_SOURCE_START // 107s
const SEG_B_SOURCE_START = 35 * 60 + 45 // 2145s
const SEG_B_SOURCE_END = 44 * 60 + 0 //    2640s
const CLIP_DURATION = 10 * 60 + 2 //       602s

const PLACEHOLDER_DESCRIPTION =
  'This is a placeholder description. Real product detials will be filled in here once we have that information. Currently this is simply for testing a concept. Thanks.'

const MAX_PRODUCTS_PER_MOMENT = 5

// Mirrors `PRODUCT_DEDUPE_WINDOW_SECONDS` in `src/demo/constants.ts`
// — kept in sync by hand so the generator's dedupe matches the
// Products-panel's. If the panel constant moves, update this number
// and re-run.
const PRODUCT_DEDUPE_WINDOW_SECONDS = 90

// Bundled product images live under `public/assets/products/<image>`,
// where `<image>` is the relative path Tier 3 stores in each
// product_match's `image` field (e.g. `homedpt/335027444.jpg`). This
// is the same prefix `resolveProductImageUrl` uses in local mode.
const BUNDLED_PRODUCT_IMAGE_BASE = '/assets/products/'

/** Map a source-time second to its clip-time equivalent, or `null` if
 *  the source-time falls outside Segment A or B. */
function sourceToClip(sourceSec) {
  if (sourceSec >= SEG_A_SOURCE_START && sourceSec <= SEG_A_SOURCE_END) {
    return sourceSec - SEG_A_SOURCE_START
  }
  if (sourceSec >= SEG_B_SOURCE_START && sourceSec <= SEG_B_SOURCE_END) {
    return SEG_A_DURATION + (sourceSec - SEG_B_SOURCE_START)
  }
  return null
}

/** Strip a leading `$` from Tier 3's price strings (e.g. `"$169.00"`)
 *  so the pause-overlay adapter's own `$`-prefixing logic doesn't
 *  double up. */
function stripDollar(price) {
  if (typeof price !== 'string') return ''
  return price.replace(/^\$/, '').trim()
}

const tier3 = JSON.parse(readFileSync(TIER3_PATH, 'utf8'))
const ctaMoments = JSON.parse(readFileSync(PAUSE_MOMENTS_PATH, 'utf8'))

// Step 1-3: collect scenes with products, re-anchored to clip-time.
// Each scene contributes its products at its own `clipStart` — that's
// the timestamp the dedupe + trailing-window logic keys against
// (matches how the Products panel anchors entries to `scene.start`).
const candidates = []
for (const scene of tier3.Scenes ?? []) {
  const products = (scene.objects ?? [])
    .flatMap((obj) => obj.product_match ?? [])
    .filter((p) => p && p.product_id)
  if (products.length === 0) continue
  const clipStart = sourceToClip(scene.startTime)
  const clipEnd = sourceToClip(scene.endTime)
  if (clipStart == null || clipEnd == null) continue
  candidates.push({
    sceneNumber: scene.scene,
    clipStart,
    clipEnd,
    products,
  })
}
candidates.sort((a, b) => a.clipStart - b.clipStart)

// Step 4: build a deduped flat list of products in clip-time order.
// Mirrors `buildProductEntries` in `src/demo/utils/productEntries.ts`
// — within `PRODUCT_DEDUPE_WINDOW_SECONDS` the same product (keyed by
// product_id) is collapsed; gaps larger than the window let it
// reappear naturally later in the clip.
const dedupedProducts = []
const lastEmittedAt = new Map()
for (const cand of candidates) {
  for (const product of cand.products) {
    const key = String(product.product_id)
    const previous = lastEmittedAt.get(key)
    if (previous !== undefined && cand.clipStart - previous < PRODUCT_DEDUPE_WINDOW_SECONDS) {
      continue
    }
    dedupedProducts.push({ sceneStart: cand.clipStart, product })
    lastEmittedAt.set(key, cand.clipStart)
  }
}

// Step 5: window each scene-with-products to the next one for the
// `[startTime, endTime]` lookup, then populate that window with the
// 5 MOST RECENT deduped products at the window's start time.
// Trailing-5 rolling: the same effect as scrubbing the Products panel
// — the carousel feels like "what's been on screen recently" rather
// than "only this scene's products".
const windows = candidates.map((c, i) => {
  const next = candidates[i + 1]
  const windowEnd = next ? next.clipStart : CLIP_DURATION
  // Find the 5 most recent deduped products with sceneStart <= this
  // window's start. Linear scan — list is small.
  const trailing = []
  for (let j = dedupedProducts.length - 1; j >= 0; j--) {
    if (dedupedProducts[j].sceneStart <= c.clipStart + 0.001) {
      trailing.push(dedupedProducts[j].product)
      if (trailing.length >= MAX_PRODUCTS_PER_MOMENT) break
    }
  }
  // `trailing` is newest-first; reverse so the carousel renders in
  // clip-time order (oldest first → newest last).
  trailing.reverse()
  return {
    sceneNumber: c.sceneNumber,
    startTime: Number(c.clipStart.toFixed(2)),
    endTime: Number(windowEnd.toFixed(2)),
    products: trailing,
  }
})

// Step 6-7: emit pause-moments shape. Every product gets the same
// placeholder description (Tier 3 doesn't carry copy); `image` uses
// the bundled-asset path that the Products panel resolves to in
// local mode.
const sceneEntries = windows.map((w) => ({
  scene: w.sceneNumber,
  startTime: w.startTime,
  endTime: w.endTime,
  lengthInSeconds: Number((w.endTime - w.startTime).toFixed(2)),
  objects: w.products.map((p) => ({
    name: 'Object',
    product_match: [
      {
        product_id: String(p.product_id),
        name: p.name ?? '',
        description: PLACEHOLDER_DESCRIPTION,
        cta: 'Shop Now',
        price: stripDollar(p.price),
        image: p.image
          ? `${BUNDLED_PRODUCT_IMAGE_BASE}${p.image.replace(/^\/+/, '')}`
          : '',
        // `qr` carries the product link URL so the pause-overlay
        // click-out resolves to the real product page. The overlay's
        // QR rendering happens to encode this same URL — for the POC
        // that's acceptable; production will swap in branded
        // sponsor-supplied QRs.
        qr: p.link || '',
      },
    ],
  })),
}))

const ctaCampaign = ctaMoments.campaign?.[0] ?? {}

const output = {
  video_id: 'DHYH',
  _note:
    'Auto-generated by `scripts/generate-organic-pause-moments.mjs` from `tier3.json`. Do not edit by hand — re-run the script when Tier 3 data changes. Theme block is reused verbatim from `pause-moments.json` so Organic Pause uses the same campaign artwork as CTA Pause; per-product descriptions are placeholders because Tier 3 does not carry product copy.',
  campaign: [
    {
      campaign_id: 'dhyh-organic-pause-poc',
      pause_to_shop_screen: ctaCampaign.pause_to_shop_screen ?? {},
      product_detail_screen: ctaCampaign.product_detail_screen ?? {},
      scenes: sceneEntries,
    },
  ],
}

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8')

console.log(
  `Wrote ${OUT_PATH}\n  scenes: ${sceneEntries.length}\n  total products: ${sceneEntries.reduce(
    (n, s) => n + s.objects.length,
    0
  )}`
)

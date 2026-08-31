// Shared core for generating the CTA Pause + Organic Pause moment JSONs from a
// Tier 3 product source. Used by:
//   • scripts/generate-cta-pause-moments.mjs      (skill: generate-cta-pause-json)
//   • scripts/generate-organic-pause-moments.mjs  (skill: generate-organic-pause-json)
//
// Both pause modes consume the SAME document shape (campaign + theme + scenes +
// objects + product_match) via src/demo/content/dhyh/pauseMoments.ts. This module
// holds the conversion logic so the two generators can't drift apart.
//
// ── Two knobs the generators expose (see each script's header) ──
//
// TIME_BASE — how to interpret each Tier 3 scene's start/end time:
//   'clip'          : scenes are ALREADY on the playable clip timeline (e.g.
//                     `DB-DemoVid1`, processed natively from the spliced mp4).
//                     Pass-through 1:1 — works for ANY content length (10-min
//                     clip, full 44-min native export, or a segment export).
//   'source-splice' : scenes are on a longer SOURCE timeline and the playable
//                     clip is a splice of segments out of it (the legacy 44-min
//                     `DHYH1` case). Times are remapped onto the clip via the
//                     segment windows; scenes outside every segment are dropped.
//
// IMAGE_SOURCE — where product images resolve from (easy local↔CDN↔S3 swap):
//   { mode: 'cdn' }   → use each product's own absolute `image` URL (as-is).
//   { mode: 'local' } → `${localBase}/<product_id>.<ext>` (bundled/self-hosted).
//   { mode: 's3', s3Base } → `${s3Base}/<product_id>.<ext>`.
// To move hosting later, change `mode` (+ base) and re-run the generator — the
// emitted JSON always carries a ready-to-use URL, no app change required.

export const SPLICE_DEFAULT = {
  segAStart: 19 * 60 + 45, // 1185s (DHYH 44-min source)
  segAEnd: 21 * 60 + 32, //   1292s
  segBStart: 35 * 60 + 45, // 2145s
  segBEnd: 44 * 60 + 0, //    2640s
}
const segADuration = (s) => s.segAEnd - s.segAStart

/** Map a Tier 3 scene's [startTime,endTime] to clip-time per TIME_BASE.
 *  Returns null when the scene doesn't belong on the clip (source-splice only). */
export function mapSceneTime(scene, timeBase, splice = SPLICE_DEFAULT) {
  if (timeBase === 'clip') {
    return { clipStart: scene.startTime, clipEnd: scene.endTime }
  }
  const toClip = (t) => {
    if (t >= splice.segAStart && t <= splice.segAEnd) return t - splice.segAStart
    if (t >= splice.segBStart && t <= splice.segBEnd)
      return segADuration(splice) + (t - splice.segBStart)
    return null
  }
  const clipStart = toClip(scene.startTime)
  const clipEnd = toClip(scene.endTime)
  if (clipStart == null || clipEnd == null) return null
  return { clipStart, clipEnd }
}

/** Collect scenes that carry products, mapped to clip-time, sorted by start. */
export function collectCandidates(tier3, timeBase, splice = SPLICE_DEFAULT) {
  const out = []
  for (const scene of tier3.Scenes ?? []) {
    const products = (scene.objects ?? [])
      .flatMap((o) => o.product_match ?? [])
      .filter((p) => p && p.product_id)
    if (products.length === 0) continue
    const t = mapSceneTime(scene, timeBase, splice)
    if (!t) continue
    out.push({ sceneNumber: scene.scene, clipStart: t.clipStart, clipEnd: t.clipEnd, products })
  }
  out.sort((a, b) => a.clipStart - b.clipStart)
  return out
}

/** Deduped flat product list in clip-time order. A product (keyed by
 *  product_id) reappearing within `windowSec` of its last emission collapses;
 *  larger gaps let it resurface. Mirrors the Products-panel dedupe. */
export function dedupeProducts(candidates, windowSec) {
  const deduped = []
  const lastAt = new Map()
  for (const c of candidates) {
    for (const p of c.products) {
      const key = String(p.product_id)
      const prev = lastAt.get(key)
      if (prev !== undefined && c.clipStart - prev < windowSec) continue
      deduped.push({ sceneStart: c.clipStart, product: p })
      lastAt.set(key, c.clipStart)
    }
  }
  return deduped
}

/** Up to `max` products whose sceneStart ≤ `atTime`, returned in clip-time
 *  order (oldest→newest). The "trailing-N rolling window" — same feel as
 *  scrubbing the Products panel. */
export function trailingProducts(deduped, atTime, max) {
  const trailing = []
  for (let j = deduped.length - 1; j >= 0; j--) {
    if (deduped[j].sceneStart <= atTime + 0.001) {
      trailing.push(deduped[j].product)
      if (trailing.length >= max) break
    }
  }
  trailing.reverse()
  return trailing
}

/** Strip a leading `$` so the overlay's own `$`-prefixing doesn't double up. */
function stripDollar(price) {
  if (typeof price === 'number') return String(price)
  if (typeof price !== 'string') return ''
  return price.replace(/^\$/, '').trim()
}

/** Resolve a product image URL per the IMAGE_SOURCE mode. */
export function productImage(product, imageSource) {
  const { mode, s3Base, localBase = '/assets/products/homedpt' } = imageSource
  const id = String(product.product_id ?? '')
  let ext = 'jpg'
  const m = (product.image || '').split('?')[0].match(/\.(jpe?g|png|webp)$/i)
  if (m) ext = m[1].toLowerCase()
  if (mode === 'local') return `${localBase.replace(/\/$/, '')}/${id}.${ext}`
  if (mode === 's3') return `${(s3Base || '').replace(/\/$/, '')}/${id}.${ext}`
  // 'cdn' (default): the product's own absolute URL.
  return product.image || ''
}

/** Map a Tier 3 product_match entry to the pause-overlay product shape. */
export function toPauseProduct(product, imageSource) {
  return {
    product_id: String(product.product_id ?? ''),
    name: product.name ?? '',
    description: product.description ?? '',
    cta: product.cta ?? 'Shop Now',
    price: stripDollar(product.price),
    image: productImage(product, imageSource),
    // `qr` is the DESTINATION URL the overlay renders as a client-side QR and
    // launches in the click-out modal — Tier 3's `link`, NOT its `qr` (which is
    // a pre-rendered QR image we don't use here).
    qr: product.link || '',
  }
}

/** Build one pause "scene" (moment) entry. */
export function buildSceneEntry(sceneNumber, startTime, endTime, products, imageSource) {
  return {
    scene: sceneNumber,
    startTime: Number(startTime.toFixed(2)),
    endTime: Number(endTime.toFixed(2)),
    lengthInSeconds: Number((endTime - startTime).toFixed(2)),
    objects: products.map((p) => ({
      name: 'Object',
      product_match: [toPauseProduct(p, imageSource)],
    })),
  }
}

/** Assemble the final pause-moments document (shared shape for both modes).
 *  `ctaPauseWindows` is OPTIONAL — only the CTA Pause generator passes it,
 *  so the resulting JSON carries the editorial window markers right
 *  alongside the moments. Organic Pause is window-less by design and omits
 *  the field entirely. */
export function buildDocument({ videoId, note, campaignId, theme, scenes, ctaPauseWindows }) {
  const doc = {
    video_id: videoId,
    _note: note,
  }
  if (Array.isArray(ctaPauseWindows)) {
    doc.cta_pause_windows = ctaPauseWindows.map(([s, e]) => ({ start: s, end: e }))
  }
  doc.campaign = [
    {
      campaign_id: campaignId,
      pause_to_shop_screen: theme.pause_to_shop_screen ?? {},
      product_detail_screen: theme.product_detail_screen ?? {},
      scenes,
    },
  ]
  return doc
}

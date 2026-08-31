// Shared pause-moments adapter — content-agnostic.
//
// Holds every type + helper that ALL pause-overlay-driven content tiles
// consume identically: the JSON document shape (`PauseMomentsDocument` →
// `PauseMomentCampaign` → `PauseMomentScene` → `PauseMomentObject` →
// `PauseMomentProduct`), the per-clip-time resolver
// (`findActiveSceneInDocument`), the carousel/detail payload builder
// (`buildPauseOverlayPayload`), and the URL helpers that peel an image
// out of a tracker URL or treat a plain image path verbatim
// (`extractCtaImageUrl`, `resolveQrDestination`).
//
// Per-content wrappers (e.g. `src/demo/content/dhyh/pauseMoments.ts`,
// `.../masterchef/pauseMoments.ts`) own the actual JSON documents +
// thin resolver exports — those are the only files that import their
// own per-content `ads/cta-pause.json` and `ads/organic-pause.json`.
// The shared module never touches per-content data directly.

import type {
  PauseOverlayPayload,
  PauseProductDetail,
  PauseProductTile,
} from '../../components/player/pause-overlay'
import { resolveProductImageUrl } from '../../sources'

// ─── Document types ──────────────────────────────────────────────────────────

export type PauseMomentProduct = {
  product_id: string
  name: string
  description: string
  cta: string
  price: string
  image: string
  /** Destination URL the user lands on after scanning. The detail
   *  card renders this client-side as a real QR code via
   *  `qrcode.react`. */
  qr: string
}

export type PauseMomentObject = {
  name: string
  product_match: PauseMomentProduct[]
}

export type PauseMomentScene = {
  scene: number
  /** Inclusive clip-time start in seconds. */
  startTime: number
  /** Inclusive clip-time end in seconds. */
  endTime: number
  lengthInSeconds: number
  objects: PauseMomentObject[]
}

export type PauseMomentCampaign = {
  campaign_id: string
  pause_to_shop_screen: {
    cta_url: string
    sponsored_by_logo_url: string
    selected_product_background_image: string
    /** Optional hex / CSS color used on the focused-tile background.
     *  When supplied it takes precedence over the image — lets a campaign
     *  brand the focus state with a solid color (e.g. Wayfair `#7b189f`)
     *  without producing a bg image. */
    selected_product_background_color?: string
    product_image_placeholder_url: string
  }
  product_detail_screen: {
    shop_logo_url: string
    background_image: string
    /** Optional hex / CSS color painted behind the detail card content.
     *  Same precedence as `selected_product_background_color`. */
    background_color?: string
    product_image_placeholder_url: string
  }
  scenes: PauseMomentScene[]
}

/** Editorial CTA Pause windows (clip-time seconds). Present on
 *  `cta-pause.json` documents — the script emits them as a top-level field
 *  so partners can see at a glance when the pause-to-shop hint is meant
 *  to fire. Organic Pause documents omit this field entirely (organic is
 *  window-less by design). The per-content `timeline.ts` constant
 *  (`*_CTA_PAUSE_WINDOWS`) is derived from this field — the JSON is the
 *  source of truth. */
export type PauseMomentsWindow = {
  readonly start: number
  readonly end: number
}

export type PauseMomentsDocument = {
  video_id: string
  cta_pause_windows?: ReadonlyArray<PauseMomentsWindow>
  campaign: PauseMomentCampaign[]
}

// ─── Window helpers ──────────────────────────────────────────────────────────

/** Pull the editorial CTA windows out of a cta-pause.json document. Returns
 *  an empty array when the field is missing (older JSONs predate the field;
 *  organic-pause.json never has it). Each per-content `timeline.ts` calls
 *  this once at import time so the `*_CTA_PAUSE_WINDOWS` constant is
 *  derived from the JSON — single source of truth, no drift risk. */
export const readCtaPauseWindows = (
  doc: PauseMomentsDocument
): ReadonlyArray<PauseMomentsWindow> => doc.cta_pause_windows ?? []

// ─── Constants ───────────────────────────────────────────────────────────────

/** Up to N tiles per moment — the carousel's visual cap (3 visible, 4th
 *  peeking, 5th in scroll). Beyond five the scroll affordance does nothing
 *  meaningful, so we cap to keep the layout honest. */
export const MAX_TILES_PER_MOMENT = 5

// ─── CTA image extraction ────────────────────────────────────────────────────

/** Resolve the CTA image from the `cta_url` field. Two patterns supported:
 *
 *  1. **Tracker URL** (partner-supplied): an absolute URL whose `img=`
 *     query parameter points at the actual CTA image. The demo doesn't
 *     fire the tracker — it peels the embedded image URL out and uses
 *     it directly.
 *  2. **Direct image URL or path** (per-content campaigns): an image
 *     URL/path with a recognizable extension (`.png` / `.jpg` /
 *     `.jpeg` / `.svg` / `.webp` / `.gif`), or a root-relative path
 *     starting with `/assets/…`. Returned verbatim so the campaign can
 *     ship its own CTA art without needing a tracker-URL wrapper.
 *
 *  Returns null for empty strings or any URL pattern this function
 *  can't recognize. */
export function extractCtaImageUrl(ctaUrl: string): string | null {
  if (!ctaUrl) return null
  // Tracker URL FIRST — some campaigns' tracker URLs end with `.png`
  // because the embedded `img=` value URL-encodes an image URL whose
  // path ends `.png`. If we checked the direct-image pattern first we'd
  // return the tracker URL verbatim instead of peeling the embedded
  // image out. So: try to parse + extract `img=` first; if that wins,
  // use it.
  try {
    const parsed = new URL(ctaUrl)
    const img = parsed.searchParams.get('img')
    if (img) return img
  } catch {
    // Not a parseable absolute URL — fall through to the direct-path
    // check below.
  }
  // Direct image URL/path — extension-based match. Covers root-relative
  // paths (`/assets/pause-overlay/<id>/pause-to-shop.svg`) and any
  // absolute URL ending in a recognizable image extension that didn't
  // carry an `img=` param.
  if (/\.(png|jpe?g|svg|webp|gif)(\?|$)/i.test(ctaUrl)) return ctaUrl
  return null
}

// ─── QR destination ──────────────────────────────────────────────────────────

/** The product's `qr` field carries the destination URL — the real
 *  product page, supplied directly in the Tier-3-generated pause JSONs
 *  (`qr` ← Tier 3 `link`). The detail card renders it as a client-side
 *  QR and uses it as the click-out modal URL. */
/** Affiliate wrappers arrive with an unsubstituted publisher macro, e.g.
 *  `https://goto.walmart.com/c/|PUBID|/568844/9383?…&u=<encoded product url>`.
 *  Walmart rejects those outright ("The link you clicked on is malformed"), so
 *  a QR built from one is dead on arrival.
 *
 *  The real product page is carried in the wrapper's `u=` parameter, so when a
 *  macro is still present we unwrap to that. Once the live team substitutes
 *  their publisher id the macro is gone, the wrapper is valid, and it is used
 *  as-is so affiliate attribution survives. Non-affiliate URLs (DHYH ships
 *  direct homedepot.com links) fall straight through. */
const UNSUBSTITUTED_MACRO = /\|[A-Z0-9_]+\||\{[A-Z0-9_]+\}/

export function unwrapAffiliateUrl(url: string): string {
  if (!UNSUBSTITUTED_MACRO.test(url)) return url
  try {
    const embedded = new URL(url).searchParams.get('u')
    if (embedded && /^https?:\/\//i.test(embedded)) return embedded
  } catch {
    // Not parseable as a URL — fall through and return the original so the
    // caller still has something to show rather than losing the value.
  }
  return url
}

export function resolveQrDestination(product: PauseMomentProduct): string | null {
  if (!product.qr) return null
  return unwrapAffiliateUrl(product.qr)
}

// ─── Active-scene resolver ───────────────────────────────────────────────────

/** Returns the scene whose `[startTime, endTime]` (inclusive) contains
 *  the supplied clip-time, or null if no scene covers that point.
 *  Linear scan — both fixtures fit comfortably; if scene count
 *  approaches the hundreds we can switch to sorted-array binary
 *  search. */
export function findActiveSceneInDocument(
  doc: PauseMomentsDocument,
  clipSeconds: number
): { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null {
  for (const campaign of doc.campaign) {
    for (const scene of campaign.scenes) {
      if (clipSeconds >= scene.startTime && clipSeconds <= scene.endTime) {
        return { scene, campaign }
      }
    }
  }
  return null
}

// ─── PauseOverlayPayload builder ─────────────────────────────────────────────

/** Adapts a single scene + its owning campaign into the
 *  `PauseOverlayPayload` consumed by `<PauseOverlay>`. Theme colours
 *  from the JSON are intentionally ignored — the demo applies the
 *  Sales Demo Tool's own theme regardless of what the upstream
 *  document specifies. */

// ─── Tile title truncation ───────────────────────────────────────────────────

/** Character budget for a carousel tile title.
 *
 *  The tile's Figma text box is ~60% of tile width over 3 clamped lines, which
 *  holds roughly this much at the reference size. Retail feeds vary wildly —
 *  DHYH's titles run to a median of 85 characters, Abbott's to 112 with a
 *  maximum of 198 — so relying on the CSS line-clamp alone means the tile's
 *  appearance depends on which content is loaded, and at small player sizes
 *  (where the font hits its `clamp()` floor) three lines grow tall enough to
 *  collide with the "Shop Now" CTA beneath them.
 *
 *  Truncating here makes the tile read identically for every content. The FULL
 *  title is preserved on the detail card and in the product-destination modal,
 *  which is where a shopper goes for the complete name. */
const TILE_TITLE_MAX_CHARS = 68

/** Truncate at a word boundary where possible, with an ellipsis.
 *
 *  Retail titles frequently omit the space after a comma
 *  (`"Backpacks,Fashion School Bag"`), producing tokens too long to wrap. We
 *  treat commas and slashes as break opportunities alongside whitespace so the
 *  cut lands somewhere readable rather than mid-word. */
export function truncateTileTitle(
  title: string,
  maxChars: number = TILE_TITLE_MAX_CHARS
): string {
  const clean = title.trim()
  if (clean.length <= maxChars) return clean
  const window = clean.slice(0, maxChars)
  // Prefer the last natural break; only accept it if it keeps most of the
  // budget, otherwise a title whose first break is early would be gutted.
  const lastBreak = Math.max(
    window.lastIndexOf(' '),
    window.lastIndexOf(','),
    window.lastIndexOf('/')
  )
  const cut = lastBreak > maxChars * 0.6 ? window.slice(0, lastBreak) : window
  return `${cut.replace(/[\s,\-/]+$/, '')}…`
}

export function buildPauseOverlayPayload(
  scene: PauseMomentScene,
  campaign: PauseMomentCampaign,
  contentId: string
): PauseOverlayPayload {
  // Flatten objects → products. Real-world JSON sometimes has multiple
  // objects each with multiple product matches; this preserves order
  // (objects-major, products within each) and caps at MAX_TILES.
  const products = scene.objects
    .flatMap((obj) => obj.product_match)
    .slice(0, MAX_TILES_PER_MOMENT)

  // Fallback chain for tile/detail images: per-product image →
  // campaign placeholder URL → null (component renders gray box).
  const tilePlaceholder =
    campaign.pause_to_shop_screen.product_image_placeholder_url || null
  const detailPlaceholder =
    campaign.product_detail_screen.product_image_placeholder_url || null

  // Product images MUST go through the shared resolver, not straight from the
  // JSON. `image` may be an absolute CDN URL (DHYH) or a bare filename
  // (`15454219386.jpg` — the S3-friendly shape). Used verbatim, a bare filename
  // resolves against the current page path and 404s, so every tile renders the
  // placeholder. The resolver handles both, and maps relative names onto
  // `/assets/products/` locally or `${VITE_CONTENT_SOURCE_BASE_URL}/<id>/products/`
  // when a remote base is configured.
  const productImage = (p: PauseMomentProduct): string | null =>
    p.image ? resolveProductImageUrl(contentId, { image: p.image }) : null

  const tiles: PauseProductTile[] = products.map((p) => ({
    id: p.product_id,
    // Truncated for the carousel only — `detailsById` below keeps p.name whole.
    title: truncateTileTitle(p.name),
    ctaText: p.cta || 'Learn More',
    imageSrc: productImage(p) || tilePlaceholder,
  }))

  const detailsById: Record<string, PauseProductDetail> = {}
  for (const p of products) {
    detailsById[p.product_id] = {
      id: p.product_id,
      title: p.name,
      ctaText: p.cta || 'Learn More',
      imageSrc: productImage(p) || detailPlaceholder,
      description: p.description,
      // Currency formatting is implicit in the upstream JSON ("130",
      // "138.99"). Prepend the dollar sign and otherwise leave the
      // string alone — once the upstream supplies pre-formatted
      // prices we can drop this.
      price: p.price ? `$${p.price}` : '',
      qrDestinationUrl: resolveQrDestination(p),
    }
  }

  return {
    sponsorLabel: 'Sponsored by',
    sponsorLogoSrc:
      campaign.pause_to_shop_screen.sponsored_by_logo_url || null,
    detailSponsorLogoSrc: campaign.product_detail_screen.shop_logo_url || null,
    pauseToShopCtaImageSrc: extractCtaImageUrl(
      campaign.pause_to_shop_screen.cta_url
    ),
    tileBackgroundImageSrc:
      campaign.pause_to_shop_screen.selected_product_background_image || null,
    tileBackgroundColor:
      campaign.pause_to_shop_screen.selected_product_background_color || null,
    detailBackgroundImageSrc:
      campaign.product_detail_screen.background_image || null,
    cardBackgroundColor: campaign.product_detail_screen.background_color || null,
    tiles,
    detailsById,
  }
}

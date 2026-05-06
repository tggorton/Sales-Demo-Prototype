import type {
  PauseOverlayPayload,
  PauseProductDetail,
  PauseProductTile,
} from '../../components/player/pause-overlay'
import pauseMomentsJson from './pause-moments.json'

// JSON document shape. Mirrors the partner-supplied test fixture
// (`_Temp-Files/test-moments-json-c`), trimmed to only what the
// adapter reads — campaign theme + scene timing + product matches.
// Trackers, frame counts, IAB data, etc. are intentionally absent
// from this type so adding them back later requires a deliberate
// edit, not a silent deserialisation.

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
  /** Inclusive clip-time start in seconds. Already on the spliced
   *  clip-time axis in the fixture (no rebasing needed). */
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
    product_image_placeholder_url: string
  }
  product_detail_screen: {
    shop_logo_url: string
    background_image: string
    product_image_placeholder_url: string
  }
  scenes: PauseMomentScene[]
}

export type PauseMomentsDocument = {
  video_id: string
  campaign: PauseMomentCampaign[]
}

// Cast through `unknown` because the JSON includes informational keys
// (`_note`, theme color overrides we ignore, etc.) that aren't on the
// type. Treating the import as the typed document is a deliberate
// trim: the adapter reads only the fields above.
const document = pauseMomentsJson as unknown as PauseMomentsDocument

// Up to N tiles per moment — beyond five the carousel scrolls, but
// editorial direction is "show the number associated with the moment",
// no padding. Five is the visual cap (3 visible, 4th peeking, 5th in
// scroll); we cap to that here so the overlay never lands in a state
// where its scroll affordance does nothing.
const MAX_TILES_PER_MOMENT = 5

/** The upstream `cta_url` is a tracker pixel URL that embeds the
 *  CTA image as an `img` query parameter (so a single fetch can both
 *  fire analytics and resolve to an image asset). The demo doesn't
 *  fire trackers, so we only need the embedded image URL — peel it
 *  out of the query string. Returns null for empty strings or any
 *  URL that doesn't carry an `img` param. */
function extractCtaImageUrl(ctaUrl: string): string | null {
  if (!ctaUrl) return null
  try {
    const parsed = new URL(ctaUrl)
    const img = parsed.searchParams.get('img')
    return img || null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────
// TEMPORARY product-destination overrides (delete when upstream
// supplies final URLs directly).
//
// The JSON's `qr` field today is a paramountplus-tv.com tracker
// URL that fires pixels then JS-redirects to a Home Depot product
// page. Browsers can't follow that JS-redirect inside our iframe
// modal in a way that ends up showing the destination — and even
// when they do, Home Depot's CSP / Akamai bot-protection often
// blocks framing. So as a stopgap we map the partner-supplied
// product `name` straight to the known Home Depot URL and feed
// that final URL to the QR generator + the modal iframe.
//
// Keyed by `product.name` (not `product_id`) because the same
// product appears under different IDs across scenes; the name is
// the stable axis. When the upstream adopts final URLs in the JSON
// directly, drop this map and the override branch in the adapter.
const TEMP_PRODUCT_DESTINATION_OVERRIDES: Record<string, string> = {
  'Product-1':
    'https://www.homedepot.com/p/Makita-18V-LXT-5-3-8-in-Circular-Trim-Saw-Tool-Only-XSS03Z/205561436',
  'Product-2':
    "https://www.homedepot.com/p/Milwaukee-Electrician-s-Pliers-Hand-Tool-Set-5-Piece-48-22-6331-48-22-6100-48-22-3079/310730449",
  'Product-3':
    'https://www.homedepot.com/p/Milwaukee-M18-FUEL-18V-Lithium-Ion-Brushless-Cordless-4-1-2-in-5-in-Grinder-w-Paddle-Switch-Tool-Only-2880-20/315445886',
  'Product-4':
    'https://www.homedepot.com/p/Milwaukee-M18-18V-Lithium-Ion-Cordless-1-2-in-Drill-Driver-Tool-Only-2606-20/204632932',
  'Product-5':
    'https://www.homedepot.com/p/BUCKET-BOSS-3-Bag-17-Pocket-Professional-High-Visibility-Framers-Work-Tool-Belt-Tool-Storage-Suspension-Rig-with-Suspenders-in-Black-55285-HV/309173071',
}

function resolveQrDestination(product: PauseMomentProduct): string | null {
  return TEMP_PRODUCT_DESTINATION_OVERRIDES[product.name] || product.qr || null
}

/** Returns the scene whose `[startTime, endTime]` (inclusive) contains
 *  the supplied clip-time, or null if no scene covers that point.
 *  Linear scan — fixture has at most a handful of scenes; if this
 *  grows we can switch to a sorted-array binary search. */
export function getActivePauseMomentScene(
  clipSeconds: number
): { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null {
  for (const campaign of document.campaign) {
    for (const scene of campaign.scenes) {
      if (clipSeconds >= scene.startTime && clipSeconds <= scene.endTime) {
        return { scene, campaign }
      }
    }
  }
  return null
}

/** Adapts a single scene + its owning campaign into the
 *  `PauseOverlayPayload` consumed by `<PauseOverlay>`. Theme colours
 *  from the JSON are intentionally ignored — the demo applies the
 *  Sales Demo Tool's own magenta-on-white-and-grey theme regardless
 *  of what the upstream document specifies. */
export function buildPauseOverlayPayload(
  scene: PauseMomentScene,
  campaign: PauseMomentCampaign
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

  const tiles: PauseProductTile[] = products.map((p) => ({
    id: p.product_id,
    title: p.name,
    ctaText: p.cta || 'Learn More',
    imageSrc: p.image || tilePlaceholder,
  }))

  const detailsById: Record<string, PauseProductDetail> = {}
  for (const p of products) {
    detailsById[p.product_id] = {
      id: p.product_id,
      title: p.name,
      ctaText: p.cta || 'Learn More',
      imageSrc: p.image || detailPlaceholder,
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
    detailBackgroundImageSrc:
      campaign.product_detail_screen.background_image || null,
    tiles,
    detailsById,
  }
}

/** Convenience wrapper: clip-time → payload (or null if no moment is
 *  active). Used by `useDemoPlayback` to drive the live overlay
 *  contents from the timeline. */
export function getActivePauseOverlayPayload(
  clipSeconds: number
): PauseOverlayPayload | null {
  const match = getActivePauseMomentScene(clipSeconds)
  if (!match) return null
  return buildPauseOverlayPayload(match.scene, match.campaign)
}

import type {
  PauseOverlayPayload,
  PauseProductDetail,
  PauseProductTile,
} from '../../components/player/pause-overlay'
import pauseMomentsJson from './ads/cta-pause.json'
import organicPauseMomentsJson from './ads/organic-pause.json'

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
const ctaPauseDocument = pauseMomentsJson as unknown as PauseMomentsDocument
const organicPauseDocument =
  organicPauseMomentsJson as unknown as PauseMomentsDocument

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

// The product's `qr` field carries the destination URL — the real product page,
// supplied directly in the Tier-3-generated pause JSONs (`qr` ← Tier 3 `link`).
// The detail card renders it as a client-side QR and uses it as the click-out
// modal URL. (The earlier `Product-1..5` → Home Depot override map is gone now
// that the data carries real URLs.)
function resolveQrDestination(product: PauseMomentProduct): string | null {
  return product.qr || null
}

/** Returns the scene whose `[startTime, endTime]` (inclusive) contains
 *  the supplied clip-time, or null if no scene covers that point.
 *  Linear scan — both fixtures fit comfortably; if scene count
 *  approaches the hundreds we can switch to sorted-array binary
 *  search. The two pause-mode resolvers below wrap this with their
 *  own JSON document, keeping their data sources isolated even
 *  though the lookup logic is shared. */
function findActiveSceneInDocument(
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

/** CTA Pause active-scene resolver — looks up against
 *  `ads/cta-pause.json` (partner-supplied editorial windows). */
export function getActivePauseMomentScene(
  clipSeconds: number
): { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null {
  return findActiveSceneInDocument(ctaPauseDocument, clipSeconds)
}

/** Organic Pause active-scene resolver — looks up against
 *  `ads/organic-pause.json` (auto-generated from `tier3.json`).
 *  Distinct from the CTA Pause resolver per the playback-mode
 *  isolation rule, but shares the same underlying lookup. */
export function getActiveOrganicMomentScene(
  clipSeconds: number
): { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null {
  return findActiveSceneInDocument(organicPauseDocument, clipSeconds)
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

/** Convenience wrapper: clip-time → CTA Pause payload (or null if
 *  no moment is active). Used by `useDemoPlayback` to drive the
 *  CTA Pause overlay contents from the timeline. */
export function getActivePauseOverlayPayload(
  clipSeconds: number
): PauseOverlayPayload | null {
  const match = getActivePauseMomentScene(clipSeconds)
  if (!match) return null
  return buildPauseOverlayPayload(match.scene, match.campaign)
}

/** Organic Pause counterpart — clip-time → Organic Pause payload
 *  (or null if no moment is active). Reuses the same adapter as
 *  CTA Pause but routes through the Organic Pause document so the
 *  data source stays isolated. */
export function getActiveOrganicOverlayPayload(
  clipSeconds: number
): PauseOverlayPayload | null {
  const match = getActiveOrganicMomentScene(clipSeconds)
  if (!match) return null
  return buildPauseOverlayPayload(match.scene, match.campaign)
}

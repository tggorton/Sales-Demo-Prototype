import type { PauseOverlayPayload, PauseProductDetail, PauseProductTile } from './pauseOverlay.types'

// Placeholder payload used as a fallback when no per-content JSON
// resolves to an active moment (e.g. Organic Pause for now, or any
// unknown content). Shape mirrors `PauseOverlayPayload` exactly so the
// swap from placeholder → real payload is a single value change in
// `useDemoPlayback`. Five tiles per the spec; first three render
// in-frame in the default carousel layout, the last two land
// off-screen until scroll.

const placeholderTiles: PauseProductTile[] = Array.from({ length: 5 }, (_, i) => ({
  id: `placeholder-${i + 1}`,
  title: 'Long item name example goes here max characters is 45',
  ctaText: 'Learn More',
  imageSrc: null,
}))

const placeholderDetails: Record<string, PauseProductDetail> = placeholderTiles.reduce(
  (acc, tile) => {
    acc[tile.id] = {
      ...tile,
      description:
        'This is placeholder copy that will be replaced once the per-product detail JSON lands. It exists to size the typography area and confirm wrapping behavior at the typical max length.',
      price: '$00.00',
      qrDestinationUrl: null,
    }
    return acc
  },
  {} as Record<string, PauseProductDetail>
)

export const PAUSE_OVERLAY_PLACEHOLDER: PauseOverlayPayload = {
  sponsorLogoSrc: null,
  detailSponsorLogoSrc: null,
  pauseToShopCtaImageSrc: null,
  sponsorLabel: 'Sponsored by',
  tileBackgroundImageSrc: null,
  detailBackgroundImageSrc: null,
  tiles: placeholderTiles,
  detailsById: placeholderDetails,
}

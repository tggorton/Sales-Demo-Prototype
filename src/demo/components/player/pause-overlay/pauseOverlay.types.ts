// Shapes for the pause-overlay payload. The overlay surfaces a small
// catalog of products on top of the player whenever the user pauses
// playback while in `CTA Pause` or `Organic Pause` mode (Tier 3 only).
//
// These types are scaffolded ahead of the real JSON wiring so swapping
// `pauseOverlay.placeholder.ts` for a per-content payload later is a
// purely mechanical change. Keep field names stable; payload-shape
// changes downstream become harder once any external JSON is producing
// these.

export type PauseProductTile = {
  id: string
  title: string
  // CTA chip text rendered under the title (e.g. "Learn More"). Kept as
  // a per-tile field rather than a global default so future variants
  // (e.g. "Add to Cart") can mix within one carousel.
  ctaText: string
  // `null` renders the gray placeholder square. When real data is wired
  // this becomes a fully-resolved image URL (S3 or local /assets path).
  imageSrc: string | null
}

export type PauseProductDetail = PauseProductTile & {
  description: string
  // Pre-formatted price string (`"$00.00"`). The overlay never does
  // currency formatting itself — the upstream payload owns that.
  price: string
  qrLargeSrc: string | null
  qrSmallSrc: string | null
}

export type PauseOverlayPayload = {
  // Optional sponsor branding shown above the tile carousel. `null`
  // hides the header row entirely.
  sponsorLogoSrc: string | null
  sponsorLabel: string
  // Up to ~5 tiles per the spec; the carousel scrolls horizontally if
  // more are provided, but the demo design assumes 3 visible at once.
  tiles: PauseProductTile[]
  // Tile id → detail payload. Tiles without a matching entry render
  // the carousel slot but cannot open a detail view.
  detailsById: Record<string, PauseProductDetail>
}

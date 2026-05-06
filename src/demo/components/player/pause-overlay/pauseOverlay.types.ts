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
  // Destination URL the user lands on after scanning the QR code on
  // the detail card. The detail component renders the QR client-side
  // from this URL via `qrcode.react`. `null` keeps the existing gray
  // placeholder slot for tiles without a destination.
  qrDestinationUrl: string | null
}

export type PauseOverlayPayload = {
  // Optional sponsor branding shown above the tile carousel. `null`
  // hides the header row entirely.
  sponsorLogoSrc: string | null
  // Optional sponsor branding shown on the product-detail card. The
  // upstream payload treats this as a separate field from the carousel
  // sponsor (the JSON's `product_detail_screen.shop_logo_url` vs.
  // `pause_to_shop_screen.sponsored_by_logo_url`); they're often the
  // same brand but a different image asset. `null` falls back to the
  // built-in "Sponsor Logo" placeholder block.
  detailSponsorLogoSrc: string | null
  // Optional image URL for the in-playback "PAUSE TO SHOP" CTA.
  // Extracted from the upstream `pause_to_shop_screen.cta_url`'s
  // `img=` query parameter (the upstream tracker URL embeds the image
  // it'd normally redirect to). `null` hides the CTA entirely — the
  // demo intentionally has no styled fallback so the visual stays
  // upstream-driven per editorial direction.
  pauseToShopCtaImageSrc: string | null
  sponsorLabel: string
  // Background image painted on the focused/selected tile (behind the
  // tile's content). `null` falls back to the solid white background
  // per Figma.
  tileBackgroundImageSrc: string | null
  // Background image painted behind the detail card content (replaces
  // the solid white card body when supplied). `null` falls back to
  // the existing opaque white card.
  detailBackgroundImageSrc: string | null
  // Up to ~5 tiles per the spec; the carousel scrolls horizontally if
  // more are provided, but the demo design assumes 3 visible at once.
  tiles: PauseProductTile[]
  // Tile id → detail payload. Tiles without a matching entry render
  // the carousel slot but cannot open a detail view.
  detailsById: Record<string, PauseProductDetail>
}

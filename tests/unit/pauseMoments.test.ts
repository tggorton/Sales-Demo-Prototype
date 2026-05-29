import { describe, expect, it } from 'vitest'
import {
  buildPauseOverlayPayload,
  getActiveOrganicMomentScene,
  getActiveOrganicOverlayPayload,
  getActivePauseMomentScene,
  getActivePauseOverlayPayload,
} from '../../src/demo/content/dhyh/pauseMoments'

// Pin the resolver + adapter contracts. CTA Pause moments are generated from
// Tier 3 and tile the two editorial windows (77–107s, 153–532s); pausing inside
// a window resolves to a scene-accurate moment carrying products.
describe('getActivePauseMomentScene', () => {
  it('resolves a moment anywhere inside Window 1 (77–107s)', () => {
    for (const t of [77, 90, 107]) {
      const match = getActivePauseMomentScene(t)
      expect(match).not.toBeNull()
      expect(match!.scene.objects.length).toBeGreaterThan(0)
    }
  })

  it('resolves a moment anywhere inside Window 2 (153–532s)', () => {
    for (const t of [153, 300, 532]) {
      const match = getActivePauseMomentScene(t)
      expect(match).not.toBeNull()
      expect(match!.scene.objects.length).toBeGreaterThan(0)
    }
  })

  it('returns null in the gap between the two windows', () => {
    expect(getActivePauseMomentScene(108)).toBeNull()
    expect(getActivePauseMomentScene(130)).toBeNull()
    expect(getActivePauseMomentScene(152)).toBeNull()
  })

  it('returns null before the first window and after the last', () => {
    expect(getActivePauseMomentScene(0)).toBeNull()
    expect(getActivePauseMomentScene(76)).toBeNull()
    expect(getActivePauseMomentScene(533)).toBeNull()
    expect(getActivePauseMomentScene(10_000)).toBeNull()
  })
})

describe('buildPauseOverlayPayload', () => {
  it('flattens objects → products into tiles, capping at 5', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    expect(payload.tiles.length).toBeGreaterThan(0)
    expect(payload.tiles.length).toBeLessThanOrEqual(5)
    for (const tile of payload.tiles) {
      expect(typeof tile.id).toBe('string')
      expect(tile.id.length).toBeGreaterThan(0)
    }
  })

  it('lifts the per-product CTA text onto the tile', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    for (const tile of payload.tiles) {
      expect(tile.ctaText).toBe('Shop Now')
    }
  })

  it('prefixes the upstream price string with $', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    const detail = payload.detailsById[payload.tiles[0].id]
    expect(detail.price.startsWith('$')).toBe(true)
  })

  it('builds a detailsById entry for every tile', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    for (const tile of payload.tiles) {
      expect(payload.detailsById[tile.id]).toBeDefined()
    }
  })

  it('lifts the product link as the QR destination URL on each detail entry', () => {
    // The generated `qr` field carries the real product page URL (Tier 3
    // `link`); the adapter surfaces it as the detail card's QR destination.
    // (The old `Product-1..5` → Home Depot override map is gone now.)
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    for (const tile of payload.tiles) {
      expect(payload.detailsById[tile.id].qrDestinationUrl).toMatch(/^https:\/\//)
    }
  })

  it('lifts the carousel sponsor logo from pause_to_shop_screen (string or null)', () => {
    // Per 2026-05-28 direction: sponsor branding is optional. When the JSON
    // supplies a `sponsored_by_logo_url`, the adapter must surface it as a
    // string URL; when it's empty/missing, the adapter must surface it as
    // `null` so the carousel can omit the sponsor row entirely. Both shapes
    // are valid — this test pins the type contract, not a specific URL.
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    const value = payload.sponsorLogoSrc
    expect(value === null || typeof value === 'string').toBe(true)
  })

  it('lifts the detail sponsor logo from product_detail_screen (string or null)', () => {
    // Same contract as the carousel logo: optional, may be null when the
    // campaign omits Paramount-style sponsor branding for the detail screen.
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    const value = payload.detailSponsorLogoSrc
    expect(value === null || typeof value === 'string').toBe(true)
  })

  it('lifts the focused-tile background image from the campaign', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    expect(payload.tileBackgroundImageSrc).toBe(
      'https://rcdn.kervinteractive.com/pts/campaigns/69fb7f33c670ce8ddf3d07f6/085df96f-88c0-4590-9180-435deca17cd9.png'
    )
  })

  it('lifts the detail card background image from the campaign', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    // The detail bg points at the local asset since 2026-05-28 (the previous
    // partner-hosted URL had the scan-QR icon baked in; the local "clean"
    // version lets the in-code overlay render at the correct position).
    expect(payload.detailBackgroundImageSrc).toBe(
      '/assets/pause-overlay/product-detail-bg.png'
    )
  })

  it('extracts the embedded image URL from the cta_url tracker', () => {
    // The upstream `cta_url` is a tracker URL with the actual CTA
    // image URL embedded as the `img=` query param. The adapter
    // peels it out so the component can render the image directly
    // without firing the tracker.
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    expect(payload.pauseToShopCtaImageSrc).toBe(
      'https://rcdn.kervinteractive.com/pts/campaigns/69fb7f33c670ce8ddf3d07f6/2cdcd1c1-3033-4079-8d27-28a9aa18da62.png'
    )
  })

  it('returns five tiles deep inside Window 2', () => {
    const match = getActivePauseMomentScene(300)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    expect(payload.tiles).toHaveLength(5)
    expect(payload.tiles[0].id.length).toBeGreaterThan(0)
  })
})

describe('getActivePauseOverlayPayload', () => {
  it('returns a payload inside a CTA Pause window', () => {
    const payload = getActivePauseOverlayPayload(90)
    expect(payload).not.toBeNull()
    expect(payload?.tiles).toHaveLength(5)
  })

  it('returns null outside any window', () => {
    expect(getActivePauseOverlayPayload(50)).toBeNull()
    expect(getActivePauseOverlayPayload(120)).toBeNull()
  })
})

// ─── Organic Pause resolver — tier3-derived moments ────────────
//
// `content/dhyh/ads/organic-pause.json` is auto-generated from
// `tier3.json` by `scripts/generate-organic-pause-moments.mjs`; its scenes cover
// the entire 0–602s clip-time range so any pause-time resolves to an
// active moment (unlike the editorial CTA Pause moments which only
// cover two windows). Concrete numbers below are tied to the
// generator's current output — re-run the script when Tier 3 changes
// and update if the asserted scene count drifts.

describe('Organic Pause resolver', () => {
  it('resolves a moment at the very start of the clip', () => {
    // Clip-time 1 second is inside the first scene-with-products
    // band the generator emits.
    const match = getActiveOrganicMomentScene(1)
    expect(match).not.toBeNull()
    expect(match?.scene.objects.length).toBeGreaterThan(0)
  })

  it('resolves a moment in the middle of the clip', () => {
    const match = getActiveOrganicMomentScene(300)
    expect(match).not.toBeNull()
    expect(match?.scene.objects.length).toBeGreaterThan(0)
  })

  it('resolves a moment near the end of the clip', () => {
    const match = getActiveOrganicMomentScene(595)
    expect(match).not.toBeNull()
    expect(match?.scene.objects.length).toBeGreaterThan(0)
  })

  it('caps each moment at 5 products (carousel cap)', () => {
    // Walk a few clip-times and confirm none of the windows exceed
    // the carousel's visual cap.
    for (const t of [1, 60, 120, 180, 240, 300, 360, 420, 480, 540, 595]) {
      const match = getActiveOrganicMomentScene(t)
      if (!match) continue
      expect(match.scene.objects.length).toBeLessThanOrEqual(5)
    }
  })

  it('builds an overlay payload with real Tier-3 product descriptions', () => {
    const payload = getActiveOrganicOverlayPayload(60)
    expect(payload).not.toBeNull()
    expect(payload?.tiles.length).toBeGreaterThan(0)
    const firstId = payload!.tiles[0].id
    const detail = payload!.detailsById[firstId]
    expect(detail.description.length).toBeGreaterThan(0)
    expect(detail.description).not.toMatch(/placeholder description/i)
  })

  it("uses the Tier-3 product's link URL as the QR destination", () => {
    // Tier 3 doesn't carry sponsor-style QR images, so the generator
    // populates `qr` with the product `link` URL — the click-out
    // works in the demo even though the rendered QR is essentially
    // a placeholder for the production QR pipeline.
    const payload = getActiveOrganicOverlayPayload(1)!
    const firstId = payload.tiles[0].id
    expect(payload.detailsById[firstId].qrDestinationUrl).toMatch(
      /^https:\/\/www\.homedepot\.com\//
    )
  })

  it('shares campaign theme assets with the CTA Pause document', () => {
    // The generator copies the `pause_to_shop_screen` and
    // `product_detail_screen` blocks from `ads/cta-pause.json` so
    // both modes use the same sponsor logos / bg artwork while the
    // scenes diverge.
    const ctaPayload = getActivePauseOverlayPayload(90)!
    const organicPayload = getActiveOrganicOverlayPayload(60)!
    expect(organicPayload.detailSponsorLogoSrc).toBe(
      ctaPayload.detailSponsorLogoSrc
    )
    expect(organicPayload.tileBackgroundImageSrc).toBe(
      ctaPayload.tileBackgroundImageSrc
    )
    expect(organicPayload.detailBackgroundImageSrc).toBe(
      ctaPayload.detailBackgroundImageSrc
    )
  })
})

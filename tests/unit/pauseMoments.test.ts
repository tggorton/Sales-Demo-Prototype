import { describe, expect, it } from 'vitest'
import {
  buildPauseOverlayPayload,
  getActiveOrganicMomentScene,
  getActiveOrganicOverlayPayload,
  getActivePauseMomentScene,
  getActivePauseOverlayPayload,
} from '../../src/demo/content/dhyh/pauseMoments'

// Pin the resolver + adapter contracts. The fixture has scene 254
// covering 77–107 (clip-time, CTA Pause Window 1) and scene 258
// covering 153–532 (Window 2), each with five products.
describe('getActivePauseMomentScene', () => {
  it('returns scene 254 inside Window 1 (77–107s)', () => {
    expect(getActivePauseMomentScene(77)?.scene.scene).toBe(254)
    expect(getActivePauseMomentScene(90)?.scene.scene).toBe(254)
    expect(getActivePauseMomentScene(107)?.scene.scene).toBe(254)
  })

  it('returns scene 258 inside Window 2 (153–532s)', () => {
    expect(getActivePauseMomentScene(153)?.scene.scene).toBe(258)
    expect(getActivePauseMomentScene(300)?.scene.scene).toBe(258)
    expect(getActivePauseMomentScene(532)?.scene.scene).toBe(258)
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
    // Scene 254 has 5 objects, each with 1 product.
    expect(payload.tiles).toHaveLength(5)
    expect(payload.tiles.map((t) => t.id)).toEqual([
      '69fb7f33c670ce8ddf3d07f6-254-1',
      '69fb7f33c670ce8ddf3d07f6-254-2',
      '69fb7f33c670ce8ddf3d07f6-254-3',
      '69fb7f33c670ce8ddf3d07f6-254-4',
      '69fb7f33c670ce8ddf3d07f6-254-5',
    ])
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
    const detail = payload.detailsById['69fb7f33c670ce8ddf3d07f6-254-1']
    expect(detail.price).toBe('$130')
    const detail4 = payload.detailsById['69fb7f33c670ce8ddf3d07f6-254-4']
    expect(detail4.price).toBe('$138.99')
  })

  it('builds a detailsById entry for every tile', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    for (const tile of payload.tiles) {
      expect(payload.detailsById[tile.id]).toBeDefined()
    }
  })

  it('lifts the QR destination URL onto each detail entry (with TEMP_PRODUCT_DESTINATION_OVERRIDES)', () => {
    // The adapter prefers the temp product-destination override map
    // (keyed by product name) over the partner-supplied `qr` field
    // because the upstream tracker URL JS-redirects to a final URL
    // that the demo can't iframe through. When the upstream supplies
    // final URLs directly the override map and this assertion go
    // away.
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    expect(
      payload.detailsById['69fb7f33c670ce8ddf3d07f6-254-1'].qrDestinationUrl
    ).toContain('homedepot.com/p/Makita-18V-LXT')
    expect(
      payload.detailsById['69fb7f33c670ce8ddf3d07f6-254-5'].qrDestinationUrl
    ).toContain('homedepot.com/p/BUCKET-BOSS')
  })

  it('lifts the carousel sponsor logo from pause_to_shop_screen', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    expect(payload.sponsorLogoSrc).toBe(
      'https://rcdn.kervinteractive.com/pts/campaigns/69fb7f33c670ce8ddf3d07f6/91786de4-f708-4229-8c9a-e27adda47dee.png'
    )
  })

  it('lifts the detail sponsor logo from product_detail_screen', () => {
    const match = getActivePauseMomentScene(90)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    expect(payload.detailSponsorLogoSrc).toBe(
      'https://rcdn.kervinteractive.com/pts/shop-logo.png'
    )
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
    expect(payload.detailBackgroundImageSrc).toBe(
      'https://rcdn.kervinteractive.com/pts/campaigns/69fb7f33c670ce8ddf3d07f6/1b8cfb41-d42a-4586-a889-15ce59d60f8a.png'
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

  it('returns scene 258 with five tiles in Window 2', () => {
    const match = getActivePauseMomentScene(300)!
    const payload = buildPauseOverlayPayload(match.scene, match.campaign)
    expect(payload.tiles).toHaveLength(5)
    expect(payload.tiles[0].id).toBe('69fb7f33c670ce8ddf3d07f6-258-1')
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
// `organic-pause-moments.json` is auto-generated from `tier3.json`
// by `scripts/generate-organic-pause-moments.mjs`; its scenes cover
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

  it('builds an overlay payload with the placeholder description', () => {
    const payload = getActiveOrganicOverlayPayload(60)
    expect(payload).not.toBeNull()
    expect(payload?.tiles.length).toBeGreaterThan(0)
    const firstId = payload!.tiles[0].id
    const detail = payload!.detailsById[firstId]
    expect(detail.description).toMatch(/placeholder description/i)
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
    // `product_detail_screen` blocks from `pause-moments.json` so
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

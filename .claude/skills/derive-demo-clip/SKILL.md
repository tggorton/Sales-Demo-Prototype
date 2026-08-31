---
name: derive-demo-clip
description: Cut a 5–10 minute demo clip out of a full-episode asset and derive the matching tier JSONs, product images, PDF reference and ad-break position. Covers window selection by taxonomy density, break placement on a silent scene boundary, S3-ready product image paths, affiliate-link cleanup, and product volume capping. Use when a full episode arrives and the demo needs a clip, after the tiers have been corrected.
---

# Skill: `/derive-demo-clip`

A full episode is the reference record; the demo needs a clip. This derives the
clip and everything that hangs off it, keeping the full-episode set intact.

> Order: `/normalize-tier-jsons` → `/audit-tier-objects` → **`/derive-demo-clip`** → `/add-content`.

## 1. Pick the window by taxonomy density, not by plot

Slide a window across the episode and score it. **Variety matters more than
volume** — a window with 5 locations demos worse than one with 9, even at equal
SKU count.

```bash
# score every 10-min window, step 30s
python3 - <<'PY'
import json
d=json.load(open('<tier3>.json')); S=d['Scenes']; DUR=d['duration_in_seconds']
for st in range(0,int(DUR-600)+1,30):
    sc=[s for s in S if s['startTime']>=st and s['endTime']<=st+600]
    sku={p['product_id'] for s in sc for o in (s.get('objects') or []) for p in (o.get('product_match') or [])}
    loc={l.get('name') for s in sc for l in (s.get('locations') or [])}
    iab={e['name'] for s in sc for e in (s.get('iab_taxonomy') or [])}
    print(f"{st//60}:{st%60:02d} scenes={len(sc):>3} SKUs={len(sku):>3} locs={len(loc)} iab={len(iab)}")
PY
```

**Strongly prefer a window starting at 0:00.** Then **source time IS clip time** —
no re-anchoring, no splice mapper, and none of the boundary-sliver problems that
`DHYH_MIN_SCENE_CLIP_OVERLAP_SECONDS` exists to solve. Abbott's best window was
0:00–10:01 on every metric anyway.

## 2. Place the ad break on a silent scene boundary

Find runs of scenes with no `audio_transcript` — a sitcom's act breaks sit there.
Score candidates on: silence either side (+2 each), location change (+2), a long
preceding hold (+1). Require an exact scene boundary.

Aim near the **midpoint** unless told otherwise. Demo viewers *scrub*; they do not
watch through, so an early break buys nothing while a mid-point break reads as a
believable commercial position. Abbott landed on 4:57.52 — 3s off midpoint,
inside a 42s silent run, on a Living Room → Kitchen cut after a 5.5s hold.

The break is **app config, not data** — `<ID>_AD_BREAK_CLIP_SECONDS` in
`content/<id>/timeline.ts`. It is not encoded in the tier JSONs, so moving it
invalidates nothing already delivered.

**CTA Pause does not track the break.** Its windows exist so a scrubbing seller
can land in one; two separated stretches over product-dense runs work well.
**Organic Pause has no windows at all** — a CTA hint for the first N seconds,
then it responds to any pause.

## 3. Derive the clip tiers

Trim scenes to the window, then:

- `duration_in_seconds` → the last kept scene's `endTime`
- `total_scenes` → the kept count
- **Rebuild every `video_metadata` rollup against the CLIP** — counts,
  `screen_time` and percentages are all relative to it
- Assert scene ids stay contiguous from 0

Tier 1 carries no objects and Tier 2 no products, so guard for missing keys.

## 4. Shape product images for S3

The live team hosts images on their own bucket while using the supplied product
page. `resolveProductImageUrl` builds
`${VITE_CONTENT_SOURCE_BASE_URL}/${contentId}/products/${image}` — **but only
when `image_url` is absent**, because it prefers that field first.

```json
"image":        "15454219386.jpg",                    ← bare filename
"image_source": "https://i5.walmartimages.com/…",     ← provenance, resolver ignores
```

Ship a `product_images/` folder named `<product_id>.jpg` to match, and verify
every SKU has a file.

## 5. Clean the product links

Retail feeds ship `link` as an affiliate wrapper with an unsubstituted publisher
macro — `goto.walmart.com/c/|PUBID|/…&u=<encoded page>`. **The retailer rejects
it (verified 404)**, so every click-out and QR is dead on arrival.

Unwrap to the `u=` target for `link`, preserve the original as `affiliate_link`.
Substituting a publisher id and promoting it back restores attribution.

```bash
python3 -c "
import json,re
d=json.load(open('<tier3>.json'))
pm=[p for s in d['Scenes'] for o in (s.get('objects') or []) for p in (o.get('product_match') or [])]
print(sum(1 for p in pm if re.search(r'\|[A-Z_]+\|',p.get('link','')) ), 'of', len(pm), 'links carry a macro')"
```

## 6. Cap product volume

Benchmark against the shipped reference: **DHYH runs ~36 unique SKUs/min**.
Abbott arrived at 49/min with 75% of SKUs appearing in a single scene.

Cap at **5 products per scene** — the pause generators already cap at
`MAX_PRODUCTS_PER_MOMENT = 5`, so this removes nothing a viewer can see while
cutting the unreferenced tail. Rank by: real detection over synthetic
placeholder (+3), object↔product name overlap (+2), cross-scene recurrence
(+1 each, cap 3), on-screen dwell (up to +3), confidence as weak tiebreak.

**Do not filter on product `confidence`** — the range is typically 0.60–0.78 with
no natural cut.

**Do not remove objects** whose last product is pruned. On Abbott that would have
thinned the Object panel in 52 of 179 scenes for no gain.

## 7. Cut the video

```bash
ffmpeg -ss 0 -t <exact clip seconds> -c copy -movflags +faststart in.mp4 out.mp4
```

Lossless stream copy when starting at 0:00. **Then prove the sync**: extract
frames at several timestamps from both source and clip and hash them — identical
hashes mean a JSON timestamp addresses the same picture.

Beware **variable frame rate**: Abbott's container reports 26.61 fps nominal
while the clip averages 25.88, so `startFrame`/`endFrame` are nominal. **Sync on
`startTime`/`endTime` in seconds, never frames.**

**GitHub hard-blocks any file over 100 MB.** A 10-min 1280×720 clip at ~1.7 Mb/s
is ~127 MB and will be rejected. Re-encode the repo copy to match the existing
committed precedent (`dhyh-cmp.mp4` is 61.5 MB / 817 kb/s); keep the lossless
master in the delivery folder. Verify frames still match visually after
re-encoding (mean abs diff < ~18/255).

## 8. Build the delivery folder

```
README.md          sync guarantees, synthetic-object rule, S3 shape, action items
tiers/             tier1|2|3.json
video/             the lossless clip
product_images/    <product_id>.jpg, clip SKUs only
reference/         product PDF, poster, FULL-EPISODE tiers (unpruned)
```

Keep the full-episode set complete in `reference/` — it is the training record.
Note the deliberate split so nobody "fixes" the difference later.

## 9. Product reference PDF

For the design team: thumbnail, SKU, price, first-appearance timestamp, and
**clickable** product + image URLs, grouped **BEFORE / AFTER the ad break** with
straddling products listed in both sections so each half is a complete shot list.

Downscale embedded thumbnails (~220px, q72) — full-resolution embeds produced a
60 MB PDF where 5 MB was enough.

## Verify

1. Clip duration matches the tier `duration_in_seconds` to within ~50ms.
2. Frames at several timestamps match the source.
3. Every rollup reproduces from the clip's own scenes.
4. T2 ↔ T3 parity holds on taxonomies and primary objects.
5. Every product has an image file; 0 links carry a macro.
6. `npm run build` + `npx vitest run` clean.

## Worked example

Abbott 2026-08-31 — `_Temp-Files/Abbot-JSONs/JSON-PREP-REPORT.md`,
scripts in `_Temp-Files/Abbot-JSONs/build/`.

---
name: audit-tier-objects
description: Audit and correct the object taxonomy in a partner-delivered tier JSON batch — find generic-classifier junk, mislabelled-but-real objects, room-context errors, and object↔product misalignment, then rebuild the video_metadata rollups so the show-level summary matches the scenes. Use after /normalize-tier-jsons and before wiring content into the app, or whenever a seller QA pass flags "odd" objects.
---

# Skill: `/audit-tier-objects`

Partner object labels come from a **generic image classifier**, not a
home/retail model. Every batch so far has shipped labels that are impossible for
the content. This is the pass that fixes them.

> Order: `/normalize-tier-jsons` → `/merge-music-emotion` → **`/audit-tier-objects`** →
> `/align-tier-jsons` → `/add-content`.

## The governing rule

**Correct what is demonstrably wrong; leave alone what is merely unverified.**
Where a label can be neither confirmed nor refuted, it stays. Replace rather
than delete, so object counts, bounding boxes and panel layout stay stable.

## Four evidence sources, cross-checked

1. **The seller's QA notes** — a human who watched it.
2. **The scene's own `description`** — the strongest ground truth for what is on screen.
3. **`product_match`** — a matched product is strong evidence its object is real.
4. **Statistical audit** — count every label, bucket it, sanity-check against the room.

## The trap: caption evidence alone will delete real objects

On Abbott, caption-silence flagged `Necklace` (274) and `Garlic` (145) as junk.
Both are real — 31 objects carry necklace SKUs and jewelry is a core shoppable
category; the garlic is on a kitchen counter and has its own product.

**Always check products before removing a label:**

```bash
python3 -c "
import json,collections
d=json.load(open('<tier3>.json'))
lab='Necklace'
h=[o for s in d['Scenes'] for o in (s.get('objects') or []) if o['name']==lab]
print(lab, len(h), 'objects |', sum(1 for o in h if o.get('product_match')), 'carry a product')"
```

Equally, a label with zero product backing that is impossible for the setting
(a traffic light in a living room) is safe to replace.

## Three categories of finding

**A. Mislabelled but REAL — rename, do not remove.** The highest-value fix.
Abbott's #1 object was `Lightbulb` ×721 — the Christmas string lights, whose #1
matched product is "Christmas String Lights". Renaming *created* object↔product
alignment. Look for a high-count label whose product neighbours explain it.

**B. Right object, wrong room — re-contextualise.** `Bathroom cabinet` ×190 in
kitchen scenes → `Kitchen cabinet`. High volume, low risk.

**C. Genuine junk — replace from the scene's own vocabulary**, in priority
order: a product-derived noun → an existing synthetic name → a room-appropriate
fallback. Never invent a noun the scene cannot support.

## Room classification — two hard-won rules

1. **Room comes from `locations` + `description` ONLY.** Never from product
   titles: "bathroom vanity cabinet" is sold into kitchens and will classify the
   scene as a bathroom.
2. **Split build-site signals into strong and weak.** `light switch` and
   `outlet` exist in finished rooms. Treating them as strong evidence put a
   circular saw and a pry bar in a finished home office. Weak signals only count
   alongside a strong one (saw, drywall, stud, hard hat, "under construction").

## Adding objects

Only where the scene's own evidence supports it — a caption naming the item, or
apparel inherited from a nearby beat. Two mandatory guards:

- **Added confidence must stay below the scene's top**, or the addition hijacks
  the platform's "Highest Share Of Screen Object" (which is simply the
  highest-confidence non-synthetic detection — *not* the largest bounding box).
- **Contradiction guard**: reject a borrowed garment the caption contradicts
  (`Jeans` blocked by dress/skirt). Without it, women in dresses inherit jeans
  across a cut.

Skip floor plans, slates and collages — they describe depicted things, not
things on set.

## Clutter labels need corroboration, not deletion

Labels like `Book` are often real (styled shelves) *and* often hallucinated onto
flat surfaces. Keep one only if its own caption names it, an **adjacent shot**
does, or it carries a product. Measure the gap **between shots**, not
start-to-start — a ±20s window carried a desk's genuine books across to a
cabinet close-up.

## Rebuild the rollups — always

`video_metadata` is computed independently of the scenes, so correcting scenes
does **not** touch it. DHYH shipped for months with "Sock" as the #5 object of
the episode (369s of screen time) because of exactly this.

- Aggregate over **non-synthetic** objects only.
- `count` = every instance; `screen_time` = sum of the containing scene's length;
  `screen_time_percentage` = screen_time ÷ duration; sort by screen_time desc.
- **GARM needs its own builder** — rows are keyed by name **+ risk_level**, so
  `Death/High` and `Death/Medium` are separate rows sharing one id.
- **Harvest ids from the scenes first, then the delivered rollup.** Upstream
  rollups drop low-count categories; a hand-written id map silently loses them.

## Verify (gate before declaring done)

1. Object count, bounding boxes, confidences and `synthetic` flags unchanged on
   pre-existing objects — only `name` differs.
2. **Every `product_match` payload byte-identical.**
3. Highest-confidence non-synthetic object per scene unchanged (headline stable).
4. Every rollup reproduces from its own scenes, 0 values missing.
5. T2 ↔ T3 primary-object parity 1:1.
6. Serialization preserved — **write with Node**; Python emits `0.0` where the
   canonical shape has `0`.

## Worked example

Abbott 2026-08-31: 1,393 renamed, 182 replaced, 240 added; junk 411 → 2.
Full write-up: `_Temp-Files/Abbot-JSONs/JSON-PREP-REPORT.md`.
Scripts: `_Temp-Files/Abbot-JSONs/build/fix_abbot.py`, `fix_taxonomies.py`.

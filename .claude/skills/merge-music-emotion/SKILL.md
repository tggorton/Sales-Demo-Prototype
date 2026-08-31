---
name: merge-music-emotion
description: Merge a partner batch's legacy `music_emotion` field into the unified `emotion` array with non-colliding IDs, then delete the legacy key and rebuild the video-level emotion rollup. Use whenever an incoming tier JSON still carries `music_emotion` — it is the same signal as `emotion` from an older pipeline, not a separate taxonomy. Preferred over the STRIP path in `/normalize-tier-jsons` transform B, which silently discards the moods.
---

# Skill: `/merge-music-emotion`

`emotion` is the successor to `music_emotion`; a batch carrying both is an
artifact of an older analysis pipeline, **not two distinct signals**. The mood
values are legitimate emotion-taxonomy entries — DHYH ships
`Energizing, pump-up`, `Joyful, cheerful`, `Amusing` and
`Calm, relaxing, serene` as ordinary `emotion` rows — so they belong in
`emotion`, not in the bin.

> **Relationship to the other skills**: `/normalize-tier-jsons` transform B
> describes a STRIP. Prefer this MERGE instead. Strip only when the partner
> confirms the moods are junk.

## When to invoke

- Any incoming `tier1/2/3` batch where `music_emotion` is present on scenes.
- Symptom: the Emotion panel looks thin, or two mood systems appear in the raw
  JSON panel for the same scene.

Check first:

```bash
python3 -c "
import json,collections
d=json.load(open('<tier2>.json'),)
asl=lambda v: [] if v is None else (v if isinstance(v,list) else [v])
print('scenes with music_emotion:', sum(1 for s in d['Scenes'] if s.get('music_emotion')))
print('music values:', collections.Counter(e['name'] for s in d['Scenes'] for e in asl(s.get('music_emotion'))).most_common())
print('emotion ids in use:', sorted({e['id'] for s in d['Scenes'] for e in asl(s.get('emotion')) if e.get('id')}))
"
```

If `music_emotion` is absent, this is a no-op.

## Procedure

**1. Build the id map ONCE, from the whole batch.** Collect every distinct
`music_emotion` name, then assign ids continuing past the highest `E#` already
in use across the scenes. Order by descending count, then name, so the map is
deterministic and re-runnable.

```
used  = {E0..E9}          ->  next free = E10
map   = {'Energizing, pump-up': 'E10', 'Indignant, defiant': 'E11', ...}
```

**Never reuse another content's map.** Abbot's `E7` is `Emotional`; DHYH's `E7`
is `Energizing, pump-up`. IDs are per-asset.

**2. Apply the same map to every tier in the batch.** T1/T2/T3 must agree, or
switching tiers changes the Emotion panel.

**3. Per scene**: append `{id, name, confidence}` for each `music_emotion`
entry onto `emotion`, then `del scene['music_emotion']`. Keep the original
`emotion` entries first — they are the primary signal and the panel reads
`emotion[0]` as the headline.

**4. Rebuild the video-level `emotion` rollup** from the merged scenes:
`{id, name, confidence: max, count, screen_time, screen_time_percentage}`,
sorted by `screen_time` descending. Harvest ids from the scenes first, then the
delivered rollup — upstream rollups drop low-count categories.

**5. Persist the map** next to the outputs (`music-emotion-id-map.json`) so a
re-run or a later audit resolves the same ids.

## Serialization

Write with **Node**, not Python: `JSON.stringify(data, null, 4)`, raw unicode,
no trailing newline. Python's `json.dumps` emits `0.0` where the canonical shape
has `0`. A `JSON.parse → JSON.stringify` round-trip also scrubs those artifacts
if a Python stage produced the intermediate.

## Verify (gate before declaring done)

1. `music_emotion` key gone from every scene of every tier.
2. No id collisions: every `emotion` id maps to exactly one name across the batch.
3. Per-scene `emotion` length == original emotion length + original music length.
4. The video-level rollup **reproduces from the scenes** — every distinct scene
   value present, counts and `screen_time` matching.
5. All tiers share one id→name mapping.
6. `npm run build` + `npx vitest run` clean once wired in.

## Worked example — Abbot (`abelemxmep1`), 2026-08-31

363 scenes, both tiers carried `music_emotion` alongside `emotion` (e.g. scene 0:
`emotion=Uplifting/E1 0.8`, `music_emotion=Annoying 0.987`). Scene ids in use ran
`E0`–`E9`, so the 8 mood values took `E10`–`E17`:

| id | name | count |
|---|---|---:|
| E10 | Energizing, pump-up | 295 |
| E11 | Indignant, defiant | 32 |
| E12 | Joyful, cheerful | 14 |
| E13 | Annoying | 7 |
| E14 | Amusing | 5 |
| E15 | Sad, depressing | 4 |
| E16 | Erotic, desirous | 4 |
| E17 | Calm, relaxing, serene | 2 |

Result: emotion rollup 9 rows → 18, all reproducing from the scenes; 726
`music_emotion` keys removed across the two tiers. Implementation:
`_Temp-Files/Abbot-JSONs/build/fix_abbot.py`.

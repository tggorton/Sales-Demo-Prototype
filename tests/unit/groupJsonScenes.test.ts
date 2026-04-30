import { describe, expect, it } from 'vitest'
import { groupJsonScenes } from '../../src/demo/utils/jsonPanelGroups'
import type { SceneMetadata } from '../../src/demo/types'

// Phase 4 work: the JSON panel groups adjacent scenes that share a beat
// (same music + transcript prefix + location + objects, with sticky
// inheritance over flickering empty values) into a single card. ~61% card
// reduction across the DHYH clip per SESSION_LOG. These tests pin the
// merge/split rules so a future tweak to the algorithm can't silently
// regress to the old "fingerprint splits at every flicker" behavior.

const baseScene = (
  id: number,
  overrides: Partial<SceneMetadata> & { rawJson?: Record<string, unknown> } = {}
): SceneMetadata => ({
  id: `scene-${id}`,
  start: id * 10,
  end: id * 10 + 10,
  sceneLabel: `Scene ${id}`,
  emotion: '',
  emotionScore: 0,
  considered: '',
  reasoning: '',
  textData: '',
  musicEmotion: '',
  musicScore: 0,
  cta: '',
  products: [],
  ...overrides,
})

const sceneWithSignal = (
  id: number,
  signal: {
    transcript?: string
    music?: string
    location?: string
    objects?: string[]
  },
  overrides: Partial<SceneMetadata> = {}
): SceneMetadata =>
  baseScene(id, {
    ...overrides,
    rawJson: {
      audio_transcript: signal.transcript ?? '',
      music_emotion: signal.music ? { name: signal.music } : undefined,
      locations: signal.location ? [{ name: signal.location }] : undefined,
      objects: signal.objects ? signal.objects.map((name) => ({ name })) : undefined,
    },
  })

describe('groupJsonScenes', () => {
  it('returns no groups when activeSceneIndex < 0', () => {
    const scenes = [sceneWithSignal(0, { transcript: 'Hello world', music: 'Upbeat' })]
    expect(groupJsonScenes(scenes, -1)).toEqual([])
  })

  it('only considers scenes up to and including activeSceneIndex', () => {
    const scenes = [
      sceneWithSignal(0, { transcript: 'a', music: 'm1' }),
      sceneWithSignal(1, { transcript: 'b', music: 'm2' }),
      sceneWithSignal(2, { transcript: 'c', music: 'm3' }),
    ]
    const groups = groupJsonScenes(scenes, 1)
    // Active = 1: scenes 0+1 should be considered, scene 2 ignored.
    const visited = groups.flatMap((g) => g.sceneIndices)
    expect(visited).toEqual([0, 1])
  })

  it('isEmpty scenes break group adjacency', () => {
    const scenes = [
      sceneWithSignal(0, { transcript: 'reveal', music: 'Upbeat', location: 'Kitchen' }),
      baseScene(1, { isEmpty: true }),
      sceneWithSignal(2, { transcript: 'reveal', music: 'Upbeat', location: 'Kitchen' }),
    ]
    const groups = groupJsonScenes(scenes, 2)
    // The empty scene in the middle severs adjacency even though scenes
    // 0 and 2 carry identical signals — they become two separate groups.
    expect(groups).toHaveLength(2)
    expect(groups[0].sceneIndices).toEqual([0])
    expect(groups[1].sceneIndices).toEqual([2])
  })

  it('merges adjacent scenes that share the same beat', () => {
    const scenes = [
      sceneWithSignal(0, {
        transcript: 'Welcome to the bathroom reveal',
        music: 'Upbeat',
        location: 'Bathroom',
        objects: ['sink', 'toilet'],
      }),
      sceneWithSignal(1, {
        transcript: 'Welcome to the bathroom reveal',
        music: 'Upbeat',
        location: 'Bathroom',
        objects: ['sink', 'toilet'],
      }),
    ]
    const groups = groupJsonScenes(scenes, 1)
    expect(groups).toHaveLength(1)
    expect(groups[0].sceneIndices).toEqual([0, 1])
    expect(groups[0].label).toBe('Scenes 0–1')
  })

  it('splits when music_emotion differs', () => {
    const scenes = [
      sceneWithSignal(0, { transcript: 'a', music: 'Upbeat', location: 'Kitchen' }),
      sceneWithSignal(1, { transcript: 'a', music: 'Dreamy', location: 'Kitchen' }),
    ]
    expect(groupJsonScenes(scenes, 1)).toHaveLength(2)
  })

  it('splits when transcript prefix differs', () => {
    const scenes = [
      sceneWithSignal(0, {
        transcript: 'The kitchen is the heart of the house',
        music: 'Upbeat',
      }),
      sceneWithSignal(1, {
        transcript: 'Now we move on to the bathroom reveal',
        music: 'Upbeat',
      }),
    ]
    expect(groupJsonScenes(scenes, 1)).toHaveLength(2)
  })

  it('splits when location differs', () => {
    const scenes = [
      sceneWithSignal(0, { transcript: 'a', music: 'Upbeat', location: 'Kitchen' }),
      sceneWithSignal(1, { transcript: 'a', music: 'Upbeat', location: 'Bathroom' }),
    ]
    expect(groupJsonScenes(scenes, 1)).toHaveLength(2)
  })

  it('splits when object sets differ', () => {
    // Same location but different visible objects = different beat (the
    // demo intentionally surfaces each beat's distinct product matches).
    const scenes = [
      sceneWithSignal(0, {
        transcript: 'a',
        music: 'Upbeat',
        location: 'Bathroom',
        objects: ['sink', 'mirror'],
      }),
      sceneWithSignal(1, {
        transcript: 'a',
        music: 'Upbeat',
        location: 'Bathroom',
        objects: ['bathtub', 'toilet'],
      }),
    ]
    expect(groupJsonScenes(scenes, 1)).toHaveLength(2)
  })

  it('inherits sticky values from a flickering empty scene', () => {
    // Scene 1 has empty location but still belongs to the same beat — the
    // group's location stays "Kitchen" via sticky inheritance.
    const scenes = [
      sceneWithSignal(0, { transcript: 'a', music: 'Upbeat', location: 'Kitchen' }),
      sceneWithSignal(1, { transcript: 'a', music: 'Upbeat' }), // no location
      sceneWithSignal(2, { transcript: 'a', music: 'Upbeat', location: 'Kitchen' }),
    ]
    const groups = groupJsonScenes(scenes, 2)
    expect(groups).toHaveLength(1)
    expect(groups[0].sceneIndices).toEqual([0, 1, 2])
  })

  it('splits when there is a long gap (>15s) between scene end and next start', () => {
    const scenes = [
      sceneWithSignal(0, { transcript: 'a', music: 'Upbeat' }), // ends at 10
      sceneWithSignal(1, { transcript: 'a', music: 'Upbeat' }, { start: 100, end: 110 }), // 90s gap
    ]
    expect(groupJsonScenes(scenes, 1)).toHaveLength(2)
  })

  it('lead scene is the first scene in the group with a non-empty audio_transcript', () => {
    const scenes = [
      sceneWithSignal(0, { music: 'Upbeat', location: 'Kitchen' }), // no transcript
      sceneWithSignal(1, { transcript: 'this is the lead', music: 'Upbeat', location: 'Kitchen' }),
      sceneWithSignal(2, { music: 'Upbeat', location: 'Kitchen' }),
    ]
    const groups = groupJsonScenes(scenes, 2)
    expect(groups).toHaveLength(1)
    expect(groups[0].leadIndex).toBe(1)
  })

  it('falls back to chronological first scene as lead if every scene has empty transcript', () => {
    const scenes = [
      sceneWithSignal(0, { music: 'Upbeat', location: 'Kitchen' }),
      sceneWithSignal(1, { music: 'Upbeat', location: 'Kitchen' }),
    ]
    const groups = groupJsonScenes(scenes, 1)
    expect(groups[0].leadIndex).toBe(0)
  })

  it('label is "Scene N" for a single-scene group, "Scenes M–N" for a multi-scene group', () => {
    const scenes = [
      sceneWithSignal(0, { transcript: 'solo', music: 'Upbeat' }),
      sceneWithSignal(1, { transcript: 'solo', music: 'Upbeat' }),
      sceneWithSignal(2, { transcript: 'different', music: 'Different' }),
    ]
    const groups = groupJsonScenes(scenes, 2)
    expect(groups[0].label).toBe('Scenes 0–1')
    expect(groups[1].label).toBe('Scene 2')
  })

  it('anchorIds is space-separated scene ids for downstream querySelector lookups', () => {
    const scenes = [
      sceneWithSignal(0, { transcript: 'a', music: 'Upbeat' }),
      sceneWithSignal(1, { transcript: 'a', music: 'Upbeat' }),
    ]
    const groups = groupJsonScenes(scenes, 1)
    expect(groups[0].anchorIds).toBe('scene-0 scene-1')
  })
})

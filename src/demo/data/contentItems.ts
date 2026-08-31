import { DHYH_CONTENT_ID, DHYH_VIDEO_URL } from '../content/dhyh/timeline'
import { MASTERCHEF_CONTENT_ID, MASTERCHEF_VIDEO_URL } from '../content/masterchef/timeline'
import { RHW_CONTENT_ID, RHW_VIDEO_URL } from '../content/rhw/timeline'
import { SH_CONTENT_ID, SH_VIDEO_URL } from '../content/sh/timeline'
import { BB_CONTENT_ID, BB_VIDEO_URL } from '../content/bb/timeline'
import { ABBOT_CONTENT_ID, ABBOT_VIDEO_URL } from '../content/abbot/timeline'
import type { ContentItem } from '../types'

// Full library – kept for reference. To restore a hidden title to the content grid,
// add its id to `ENABLED_CONTENT_IDS` below.
export const ALL_CONTENT_ITEMS: ContentItem[] = [
  {
    id: 'parks',
    title: 'Parks and Recreation',
    categories: ['Comedy'],
    posterUrl: '/assets/posters/parks-and-rec.png',
  },
  {
    id: 'yellowstone',
    title: 'Yellowstone',
    categories: ['Drama'],
    posterUrl: '/assets/posters/yellowstone.png',
  },
  {
    id: 'big-brother',
    title: 'Big Brother',
    categories: ['Reality TV'],
    posterUrl: '/assets/posters/big-brother.png',
  },
  {
    id: 'raymond',
    title: 'Everybody Loves Raymond',
    categories: ['Comedy'],
    posterUrl: '/assets/posters/everybody-loves-raymond.png',
  },
  {
    id: 'ted',
    title: 'Ted',
    categories: ['Comedy'],
    posterUrl: '/assets/posters/ted.png',
  },
  {
    id: 'wolf-like-me',
    title: 'Wolf Like Me',
    categories: ['Drama'],
    posterUrl: '/assets/posters/wolf-like-me.png',
  },
  {
    id: 'ap-bio',
    title: 'A.P. Bio',
    categories: ['Comedy'],
    posterUrl: '/assets/posters/ap-bio.png',
  },
  {
    id: 'below-deck',
    title: 'Below Deck',
    categories: ['Reality TV'],
    posterUrl: '/assets/posters/below-deck.png',
  },
  {
    id: DHYH_CONTENT_ID,
    title: "Don't Hate Your House",
    categories: ['Reality TV', 'Home & Garden'],
    posterUrl: '/assets/posters/dhyh.jpg',
    videoUrl: DHYH_VIDEO_URL,
  },
  {
    id: MASTERCHEF_CONTENT_ID,
    title: 'MasterChef Australia',
    categories: ['Reality TV'],
    posterUrl: '/assets/posters/masterchef.png',
    videoUrl: MASTERCHEF_VIDEO_URL,
  },
  {
    id: RHW_CONTENT_ID,
    title: 'Real Housewives of Salt Lake City',
    categories: ['Reality TV'],
    posterUrl: '/assets/posters/rhw.png',
    videoUrl: RHW_VIDEO_URL,
  },
  {
    id: SH_CONTENT_ID,
    title: 'Summer House',
    categories: ['Reality TV'],
    posterUrl: '/assets/posters/sh.png',
    videoUrl: SH_VIDEO_URL,
  },
  {
    id: BB_CONTENT_ID,
    title: 'Big Brother Australia',
    categories: ['Reality TV'],
    posterUrl: '/assets/posters/bb.jpg',
    videoUrl: BB_VIDEO_URL,
  },
  {
    id: ABBOT_CONTENT_ID,
    title: 'Abbott Elementary',
    categories: ['Comedy'],
    posterUrl: '/assets/posters/abbot.jpg',
    videoUrl: ABBOT_VIDEO_URL,
  },
]

// Ids that should be visible on the content-selection grid. Add ids here to
// surface a title in the demo; remove to hide.
// Abbott only for this review build (2026-08-31): the tile is being shared with
// the design + engineering teams so they can confirm the clip, taxonomies and
// products before ads are produced. Restore the others by adding their ids back:
//   DHYH_CONTENT_ID, MASTERCHEF_CONTENT_ID, RHW_CONTENT_ID, SH_CONTENT_ID, BB_CONTENT_ID
const ENABLED_CONTENT_IDS: string[] = [ABBOT_CONTENT_ID]

export const CONTENT_ITEMS: ContentItem[] = ALL_CONTENT_ITEMS.filter((item) =>
  ENABLED_CONTENT_IDS.includes(item.id)
)

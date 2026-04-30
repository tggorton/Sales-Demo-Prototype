import { DHYH_CONTENT_ID, DHYH_VIDEO_URL } from '../content/dhyh/timeline'
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
]

// Ids that should be visible on the content-selection grid. Only DHYH is shown right
// now; add more ids to bring other titles back into the demo.
const ENABLED_CONTENT_IDS: string[] = [DHYH_CONTENT_ID]

export const CONTENT_ITEMS: ContentItem[] = ALL_CONTENT_ITEMS.filter((item) =>
  ENABLED_CONTENT_IDS.includes(item.id)
)

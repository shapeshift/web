import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': ['https://api.zapper.xyz/v2/'],
  // Needed as a media-src for videos, not actually needed for jaypegs
  'media-src': ['https://storage.googleapis.com/zapper-fi-assets/nft/'],
}

import { matchSorter } from 'match-sorter'

export const ASSET_SEARCH_MATCH_SORTER_CONFIG = {
  keys: ['name', 'symbol'],
  threshold: matchSorter.rankings.CONTAINS,
} as const

export const ENHANCED_ASSET_SEARCH_CONFIG = {
  keys: [
    { key: 'name', threshold: matchSorter.rankings.MATCHES },
    { key: 'symbol', threshold: matchSorter.rankings.WORD_STARTS_WITH },
    { key: 'assetId', threshold: matchSorter.rankings.CONTAINS },
  ],
} as const

import { matchSorter } from 'match-sorter'

export const ASSET_SEARCH_MATCH_SORTER_CONFIG = {
  keys: ['name', 'symbol'],
  threshold: matchSorter.rankings.CONTAINS,
} as const

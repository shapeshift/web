import type MultiRef from 'react-multi-ref'

import type { AssetSearchResult, AssetSearchResults } from '@/state/slices/search-selectors'

export type GlobalSearchResultsProps = {
  results: AssetSearchResults
  activeIndex?: number
  startingIndex: number
  onClick: (arg: AssetSearchResult) => void
  searchQuery?: string
  menuNodes: MultiRef<number, HTMLElement>
}

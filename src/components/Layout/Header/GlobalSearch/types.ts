import type MultiRef from 'react-multi-ref'
import type { GlobalSearchResult } from 'state/selectors/search-selectors'

export type GlobalSearchResultsProps<T extends GlobalSearchResult = GlobalSearchResult> = {
  results: T[]
  activeIndex?: number
  startingIndex: number
  onClick: (arg: GlobalSearchResult) => void
  searchQuery?: string
  menuNodes: MultiRef<number, HTMLElement>
}

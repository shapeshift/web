import { List } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import MultiRef from 'react-multi-ref'

import { AssetResults } from './AssetResults/AssetResults'

import { SearchEmpty } from '@/components/StakingVaults/SearchEmpty'
import type { AssetSearchResult, AssetSearchResults } from '@/state/slices/search-selectors'

export type SearchResultsProps = {
  assetResults: AssetSearchResults
  activeIndex: number
  searchQuery: string
  isSearching: boolean
  onClickResult: (item: AssetSearchResult) => void
}

export const SearchResults = memo(
  ({ assetResults, activeIndex, searchQuery, isSearching, onClickResult }: SearchResultsProps) => {
    const menuNodes = useMemo(() => new MultiRef<number, HTMLElement>(), [])

    const noResults = useMemo(() => {
      return !assetResults.length
    }, [assetResults.length])

    if (isSearching && noResults) {
      return <SearchEmpty searchQuery={searchQuery} />
    }

    return (
      <List>
        <AssetResults
          onClick={onClickResult}
          results={assetResults}
          activeIndex={activeIndex}
          startingIndex={0}
          searchQuery={searchQuery}
          menuNodes={menuNodes}
        />
      </List>
    )
  },
)

import { List } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useMemo } from 'react'
import MultiRef from 'react-multi-ref'

import { AssetResults } from './AssetResults/AssetResults'

import { SearchEmpty } from '@/components/StakingVaults/SearchEmpty'

export type AssetSearchResultsProps = {
  results: Asset[]
  activeIndex: number
  searchQuery: string
  isSearching: boolean
  onClickResult: (item: Asset) => void
}

export const AssetSearchResults = memo(
  ({ results, activeIndex, searchQuery, isSearching, onClickResult }: AssetSearchResultsProps) => {
    const menuNodes = useMemo(() => new MultiRef<number, HTMLElement>(), [])

    const noResults = useMemo(() => {
      return !results.length
    }, [results.length])

    if (isSearching && noResults) {
      return <SearchEmpty searchQuery={searchQuery} />
    }

    return (
      <List>
        <AssetResults
          onClick={onClickResult}
          results={results}
          activeIndex={activeIndex}
          startingIndex={0}
          searchQuery={searchQuery}
          menuNodes={menuNodes}
        />
      </List>
    )
  },
)

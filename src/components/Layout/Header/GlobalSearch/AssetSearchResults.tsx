import { List } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useMemo } from 'react'

import { AssetResults } from './AssetResults/AssetResults'

import { SearchEmpty } from '@/components/StakingVaults/SearchEmpty'

export type AssetSearchResultsProps = {
  results: Asset[]
  searchQuery: string
  isSearching: boolean
  onClickResult: (item: Asset) => void
}

export const AssetSearchResults = memo(
  ({ results, searchQuery, isSearching, onClickResult }: AssetSearchResultsProps) => {
    const noResults = useMemo(() => {
      return !results.length
    }, [results.length])

    if (isSearching && noResults) {
      return <SearchEmpty searchQuery={searchQuery} />
    }

    return (
      <List>
        <AssetResults onClick={onClickResult} results={results} searchQuery={searchQuery} />
      </List>
    )
  },
)

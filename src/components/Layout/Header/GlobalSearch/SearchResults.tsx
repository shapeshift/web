import { List } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import MultiRef from 'react-multi-ref'
import { SearchEmpty } from 'components/StakingVaults/SearchEmpty'
import type {
  AssetSearchResult,
  GlobalSearchResult,
  SendResult,
  TxSearchResult,
} from 'state/slices/search-selectors'

import { ActionResults } from './ActionResults/ActionResults'
import { AssetResults } from './AssetResults/AssetResults'
import { TxResults } from './TxResults/TxResults'

export type SearchResultsProps = {
  assetResults: AssetSearchResult[]
  txResults: TxSearchResult[]
  sendResults: SendResult[]
  activeIndex: number
  searchQuery: string
  isSearching: boolean
  onClickResult: (item: GlobalSearchResult) => void
}

export const SearchResults = memo(
  ({
    assetResults,
    txResults,
    sendResults,
    activeIndex,
    searchQuery,
    isSearching,
    onClickResult,
  }: SearchResultsProps) => {
    const menuNodes = useMemo(() => new MultiRef<number, HTMLElement>(), [])

    const noResults = useMemo(() => {
      return !assetResults.length && !txResults.length && !sendResults.length
    }, [assetResults.length, sendResults.length, txResults.length])

    if (isSearching && noResults) {
      return <SearchEmpty searchQuery={searchQuery} />
    }

    return (
      <List>
        <ActionResults
          onClick={onClickResult}
          results={sendResults}
          searchQuery={searchQuery}
          activeIndex={activeIndex}
          startingIndex={0}
          menuNodes={menuNodes}
        />
        <AssetResults
          onClick={onClickResult}
          results={assetResults}
          activeIndex={activeIndex}
          startingIndex={0}
          searchQuery={searchQuery}
          menuNodes={menuNodes}
        />
        <TxResults
          results={txResults}
          onClick={onClickResult}
          activeIndex={activeIndex}
          startingIndex={assetResults.length}
          searchQuery={searchQuery}
          menuNodes={menuNodes}
        />
      </List>
    )
  },
)

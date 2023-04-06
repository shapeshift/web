import { Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo } from 'react'
import { Card } from 'components/Card/Card'
import { ResultsEmpty } from 'components/ResultsEmpty'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnOpportunitiesByProvider,
  selectOpportunityApiPending,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ProviderCard, ProviderCardLoading } from './ProviderCard'
import { SearchEmpty } from './SearchEmpty'

export type ProviderTableProps = {
  chainId?: ChainId
  searchQuery: string
  includeEarnBalances?: boolean
  includeRewardsBalances?: boolean
}

export const WalletProviderTable: React.FC<ProviderTableProps> = ({
  chainId,
  includeEarnBalances,
  includeRewardsBalances,
  searchQuery,
}) => {
  const isLoading = useAppSelector(selectOpportunityApiPending)
  const providers = useAppSelector(state =>
    selectAggregatedEarnOpportunitiesByProvider(state, {
      chainId,
      includeEarnBalances,
      includeRewardsBalances,
      searchQuery,
    }),
  )

  const filterRowsBySearchTerm = useCallback(
    (rows: AggregatedOpportunitiesByProviderReturn[], filterValue: any) => {
      if (!filterValue) return rows
      if (typeof filterValue !== 'string') {
        return []
      }
      const search = filterValue.trim().toLowerCase()
      const results = matchSorter(rows, search, { keys: ['provider'] })
      return results
    },
    [],
  )

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  const rows = useMemo(() => {
    return isSearching ? filterRowsBySearchTerm(providers, searchQuery) : providers
  }, [filterRowsBySearchTerm, providers, searchQuery, isSearching])

  const renderProviders = useMemo(() => {
    if (rows.length === 0) {
      return (
        <Card>
          <Card.Body>
            {searchQuery ? (
              <SearchEmpty searchQuery={searchQuery} />
            ) : (
              <ResultsEmpty ctaHref='/earn' />
            )}
          </Card.Body>
        </Card>
      )
    }
    return (
      <Flex gap={4} flexDir='column'>
        {rows.map((row, index) => (
          <ProviderCard key={`provider-${index}`} {...row} />
        ))}
      </Flex>
    )
  }, [rows, searchQuery])

  if (isLoading) {
    return (
      <Flex gap={4} flexDir='column'>
        {Array.from({ length: 10 }).map((_, index) => (
          <ProviderCardLoading key={index} />
        ))}
      </Flex>
    )
  }

  return renderProviders
}

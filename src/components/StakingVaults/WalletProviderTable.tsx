import { Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Card } from 'components/Card/Card'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { useGetReadOnlyOpportunitiesQuery } from 'state/slices/opportunitiesSlice/opportunitiesSlice'
import type { AggregatedReadOnlyOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/selectors/readonly'
import { selectAggregatedReadOnlyOpportunitiesByProvider } from 'state/slices/opportunitiesSlice/selectors/readonly'
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

  const rowsFilter = useMemo(
    () => ({
      chainId,
      includeEarnBalances,
      includeRewardsBalances,
      searchQuery,
    }),
    [chainId, includeEarnBalances, includeRewardsBalances, searchQuery],
  )
  const earnOpportunityRows = useAppSelector(state =>
    selectAggregatedEarnOpportunitiesByProvider(state, rowsFilter),
  )

  // Only for fetching - we're consumed derived data once fetched and cached
  // Maybe find a better home for this?
  useGetReadOnlyOpportunitiesQuery()

  const readOnlyOpportunityRows = useAppSelector(selectAggregatedReadOnlyOpportunitiesByProvider)

  // TODO(gomes): This will break sorting, but we do want the read only selector to be separate not to clutter the earn selector
  // Fix this before opening me
  const rows = (earnOpportunityRows as AggregatedReadOnlyOpportunitiesByProviderReturn[]).concat(
    readOnlyOpportunityRows || [],
  )

  const renderProviders = useMemo(() => {
    if (!rows.length && !isLoading) {
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
        {isLoading &&
          // Assume three max loading rows - that might not be true, but we don't want to collapse the
          // loaded rows too much and hinder visibility
          Array.from({ length: 3 }).map((_, index) => <ProviderCardLoading key={index} />)}
      </Flex>
    )
  }, [isLoading, rows, searchQuery])

  return renderProviders
}

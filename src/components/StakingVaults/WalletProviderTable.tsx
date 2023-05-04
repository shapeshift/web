import { Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Card } from 'components/Card/Card'
import { ResultsEmpty } from 'components/ResultsEmpty'
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
  const rows = useAppSelector(state =>
    selectAggregatedEarnOpportunitiesByProvider(state, rowsFilter),
  )

  const renderProviders = useMemo(() => {
    if (!rows.length) {
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

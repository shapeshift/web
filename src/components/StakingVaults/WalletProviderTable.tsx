import { Card, CardBody, Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
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

  console.log({ rows, isLoading })

  const renderProviders = useMemo(() => {
    if (!rows.length && !isLoading) {
      return (
        <Card variant='dashboard'>
          <CardBody>
            {(() => {
              if (!(includeEarnBalances || includeRewardsBalances)) return null
              if (searchQuery) return <SearchEmpty searchQuery={searchQuery} />
              return <ResultsEmpty ctaHref='/earn' ctaText='defi.startEarning' />
            })()}
          </CardBody>
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
  }, [includeEarnBalances, includeRewardsBalances, isLoading, rows, searchQuery])

  return renderProviders
}

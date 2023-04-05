import { Avatar, Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo } from 'react'
import type { Row } from 'react-table'
import { RawText } from 'components/Text'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnOpportunitiesByProvider,
  selectOpportunityApiPending,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ProviderCard } from './ProviderCard'

export type RowProps = Row<AggregatedOpportunitiesByProviderReturn>

type ProviderCellProps = {
  provider: DefiProvider
}

const ProviderCell: React.FC<ProviderCellProps> = ({ provider }) => {
  const { icon, type } = DefiProviderMetadata[provider]
  return (
    <Flex alignItems='center' gap={4}>
      <Avatar size='sm' src={icon} />
      <Flex flexDir='column'>
        <RawText>{type}</RawText>
      </Flex>
    </Flex>
  )
}

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

  return (
    <Flex gap={4} flexDir='column'>
      {rows.map(row => (
        <ProviderCard {...row} />
      ))}
    </Flex>
  )
}

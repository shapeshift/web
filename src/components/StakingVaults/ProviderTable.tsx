import type { ChainId } from '@shapeshiftoss/caip'
import type { Row } from 'react-table'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'

export type RowProps = Row<AggregatedOpportunitiesByProviderReturn>

export type ProviderTableProps = {
  chainId?: ChainId
  searchQuery: string
  includeEarnBalances?: boolean
  includeRewardsBalances?: boolean
}

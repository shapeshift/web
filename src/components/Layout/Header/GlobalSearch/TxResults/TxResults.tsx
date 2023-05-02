import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

import { ListItemSection } from '../ListItemSection'
import { StakingResult } from './StakingResult'
import { TxResult } from './TxResult'

type TxResultsProps = {
  results: GlobalSearchResult[]
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
  startingIndex: number
  searchQuery?: string
}
export const TxResults: React.FC<TxResultsProps> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
  searchQuery,
}) => {
  const renderRows = useMemo(() => {
    return results.map((result, index) => {
      const { id } = result
      return <TxResult key={`result-tx-${index}`} txId={id as TxId} />
    })
  }, [results])

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title='Transactions' />
      <List px={2}>{renderRows}</List>
    </>
  )
}

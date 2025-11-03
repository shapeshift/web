import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'
import type { TxStatus } from '@shapeshiftoss/unchained-client'

import { TransactionHistoryList } from '@/components/TransactionHistory/TransactionHistoryList'
import { selectTxIdsByFilter } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RecentTransactionFilter = {
  accountId?: AccountId
  assetId?: AssetId
  txStatus?: TxStatus
  parser?: TxMetadata['parser']
}

type RecentTransactionsBodyProps = {
  limit: number
  filter: RecentTransactionFilter
}

export const RecentTransactionsBody: React.FC<RecentTransactionsBodyProps> = ({
  filter,
  limit,
}) => {
  const txIds = useAppSelector(state => selectTxIdsByFilter(state, filter))
  return <TransactionHistoryList txIds={txIds} useCompactMode={true} initialTxsCount={limit} />
}

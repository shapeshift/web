import { useParams } from 'react-router'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'

export const SingleTransaction = () => {
  const { txId } = useParams<{ txId?: string }>()
  if (!txId) return null
  const decodedTxId = decodeURIComponent(txId)
  return <TransactionRow txId={decodedTxId} parentWidth={1200} initOpen={true} disableCollapse />
}

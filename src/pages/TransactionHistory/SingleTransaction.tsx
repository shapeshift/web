import { useParams } from 'react-router'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'

export const SingleTransaction = () => {
  const { txId } = useParams<{ txId?: string }>()
  if (!txId) return null
  const decodedTxId = decodeURIComponent(txId)
  console.info(decodedTxId)
  return <TransactionRow txId={decodedTxId} parentWidth={1200} initOpen={true} disableCollapse />
}

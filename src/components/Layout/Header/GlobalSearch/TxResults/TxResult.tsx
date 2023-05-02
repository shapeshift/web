import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

type TxResultProps = {
  txId: TxId
}
export const TxResult: React.FC<TxResultProps> = ({ txId }) => {
  return <TransactionRow useCompactMode txId={txId} parentWidth={360} />
}

import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect, useMemo } from 'react'
import { selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

type UseTxStatusProps = {
  accountId: AccountId
  txId: string
  onTxStatusConfirmed?: () => Promise<void>
  onTxStatusPending?: () => Promise<void>
  onTxStatusFailed?: () => Promise<void>
  onTxStatusChanged?: (status: TxStatus) => Promise<void>
}

export const useTxStatus = ({
  accountId,
  txId,
  onTxStatusConfirmed,
  onTxStatusFailed,
  onTxStatusPending,
  onTxStatusChanged,
}: UseTxStatusProps): TxStatus => {
  const accountAddress = useMemo(() => fromAccountId(accountId).account, [accountId])

  const serializedTxIndex = useMemo(() => {
    return serializeTxIndex(accountId, txId, accountAddress)
  }, [accountId, accountAddress, txId])

  const tx = useAppSelector(state => selectTxById(state, serializedTxIndex))

  useEffect(() => {
    if (!tx?.status) return

    onTxStatusChanged?.(tx.status)

    switch (tx.status) {
      case TxStatus.Confirmed:
        onTxStatusConfirmed?.()
        break
      case TxStatus.Failed:
        onTxStatusFailed?.()
        break
      case TxStatus.Pending:
        onTxStatusPending?.()
        break
      default:
        break
    }
  }, [tx?.status, onTxStatusChanged, onTxStatusConfirmed, onTxStatusFailed, onTxStatusPending])

  return tx?.status
}

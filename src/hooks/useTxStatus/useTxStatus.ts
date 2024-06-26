import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect, useMemo } from 'react'
import { selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

type UseTxStatusProps = {
  accountId?: AccountId | null
  txId?: string | null
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
}: UseTxStatusProps): TxStatus | undefined => {
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : undefined),
    [accountId],
  )

  const serializedTxIndex = useMemo(() => {
    return accountId && txId && accountAddress
      ? serializeTxIndex(accountId, txId, accountAddress)
      : undefined
  }, [accountId, accountAddress, txId])

  const tx = useAppSelector(state =>
    serializedTxIndex ? selectTxById(state, serializedTxIndex) : undefined,
  )

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

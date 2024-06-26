import { usePrevious } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect, useMemo } from 'react'
import { selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

type UseTxStatusProps = {
  accountId: AccountId | null
  txHash: string | null
  onTxStatusConfirmed?: () => Promise<void>
  onTxStatusPending?: () => Promise<void>
  onTxStatusFailed?: () => Promise<void>
}

export const useTxStatus = ({
  accountId,
  txHash,
  onTxStatusConfirmed,
  onTxStatusFailed,
  onTxStatusPending,
}: UseTxStatusProps): TxStatus | undefined => {
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : undefined),
    [accountId],
  )

  const serializedTxIndex = useMemo(() => {
    return accountId && txHash && accountAddress
      ? serializeTxIndex(accountId, txHash, accountAddress)
      : undefined
  }, [accountId, accountAddress, txHash])

  const tx = useAppSelector(state =>
    serializedTxIndex ? selectTxById(state, serializedTxIndex) : undefined,
  )
  const previousStatus = usePrevious(tx?.status)

  useEffect(() => {
    if (!tx?.status || previousStatus === tx?.status) return

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
  }, [tx?.status, previousStatus, onTxStatusConfirmed, onTxStatusFailed, onTxStatusPending])

  return tx?.status
}

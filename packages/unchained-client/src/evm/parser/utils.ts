import { TxStatus } from '../../types'
import type { Tx } from './types'

export const getSigHash = (inputData: string | undefined): string | undefined => {
  if (!inputData) return
  const length = inputData.startsWith('0x') ? 10 : 8
  return inputData.slice(0, length)
}

export const txInteractsWithContract = (tx: { to: string }, contract: string) => {
  return tx.to.toLowerCase() === contract.toLowerCase()
}

export const getTxStatus = (tx: Tx) => {
  const status = tx.status

  if (status === -1 && tx.confirmations <= 0) return TxStatus.Pending
  if (status === 1 && tx.confirmations > 0) return TxStatus.Confirmed
  if (status === 0) return TxStatus.Failed

  return TxStatus.Unknown
}

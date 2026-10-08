import { TransferType } from '@shapeshiftoss/unchained-client'
import { BigAmount } from '@shapeshiftoss/utils'

import { getTransfersByType } from '@/components/TransactionHistoryRows/utils'
import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'

type TransferColumns = {
  amount: string
  currency: string
  addresses: string
}

const toCell = (values: string[]): string =>
  values.length > 1 ? `"${values.join('\n')}"` : values[0]

const getTransferColumns = (transfers: Transfer[], addressKey: 'from' | 'to'): TransferColumns => {
  if (!transfers.length) return { amount: '-', currency: '-', addresses: '-' }

  const amounts = transfers.map(transfer =>
    BigAmount.fromBaseUnit({
      value: transfer.value,
      precision: transfer.asset.precision,
    }).toPrecision(),
  )
  const currencies = transfers.map(transfer => transfer.asset.symbol)
  const addresses = transfers.flatMap(transfer => transfer[addressKey])

  return {
    amount: toCell(amounts),
    currency: toCell(currencies),
    addresses: `"${addresses.join('\n')}"`,
  }
}

// A side with no transfers of its own reports the other side of the same movement
export const getReportColumns = (
  transfers: Transfer[],
): { input: TransferColumns; output: TransferColumns } => {
  const { Send, Receive } = getTransfersByType(transfers, [TransferType.Send, TransferType.Receive])

  return {
    input: getTransferColumns(Send ?? transfers, 'from'),
    output: getTransferColumns(Receive ?? transfers, 'to'),
  }
}

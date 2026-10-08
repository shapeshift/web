import { BigAmount } from '@shapeshiftoss/utils'

import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'
import { bnOrZero } from '@/lib/bignumber/bignumber'

export type TransferColumns = {
  amount: string
  currency: string
  addresses: string
}

const toCell = (values: string[]): string =>
  values.length > 1 ? `"${values.join('\n')}"` : values[0]

export const getTransferColumns = (
  transfers: Transfer[],
  addressKey: 'from' | 'to',
): TransferColumns => {
  if (!transfers.length) return { amount: '-', currency: '-', addresses: '-' }

  const amounts = transfers.map(transfer =>
    bnOrZero(
      BigAmount.fromBaseUnit({
        value: transfer.value,
        precision: transfer.asset.precision,
      }).toPrecision(),
    ).toFixed(),
  )
  const currencies = transfers.map(transfer => transfer.asset.symbol)
  const addresses = transfers.flatMap(transfer => transfer[addressKey])

  return {
    amount: toCell(amounts),
    currency: toCell(currencies),
    addresses: `"${addresses.join('\n')}"`,
  }
}

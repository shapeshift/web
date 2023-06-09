import { BigNumber } from 'bignumber.js'

import type { Token, Transfer, TransferType } from './types'

export async function findAsyncSequential<T, U>(
  array: T[],
  predicate: (element: T) => Promise<U | undefined>,
): Promise<U | undefined> {
  for (const element of array) {
    const result = await predicate(element)
    if (result) {
      return result
    }
  }
  return undefined
}

export interface AggregateTransferArgs {
  assetId: string
  from: string
  id?: string
  to: string
  token?: Token
  transfers: Transfer[]
  type: TransferType
  value: string
}

// keep track of all individual tx components and add up the total value transferred
export function aggregateTransfer(args: AggregateTransferArgs): Transfer[] {
  const { assetId, from, id, to, token, transfers, type, value } = args

  if (!new BigNumber(value).gt(0)) return transfers

  const index = transfers?.findIndex(
    t => t.type === type && t.assetId === assetId && t.from === from && t.to === to && t.id === id,
  )
  const transfer = transfers?.[index]

  if (transfer) {
    transfer.totalValue = new BigNumber(transfer.totalValue).plus(value).toString(10)
    transfer.components.push({ value })
    transfers[index] = transfer
  } else {
    transfers.push({
      type,
      assetId,
      from,
      to,
      totalValue: value,
      components: [{ value }],
      token,
      id,
    })
  }

  return transfers
}

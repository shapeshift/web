import { BigNumber } from 'bignumber.js'

import { Token, Transfer, TransferType } from './types'

export async function findAsyncSequential<T, U>(
  array: T[],
  predicate: (element: T) => Promise<U | undefined>
): Promise<U | undefined> {
  for (const element of array) {
    const result = await predicate(element)
    if (result) {
      return result
    }
  }
  return undefined
}

// keep track of all individual tx components and add up the total value transferred
export function aggregateTransfer(
  transfers: Array<Transfer>,
  type: TransferType,
  assetId: string,
  from: string,
  to: string,
  value: string,
  token?: Token
): Array<Transfer> {
  if (!new BigNumber(value).gt(0)) return transfers

  const index = transfers?.findIndex(
    (t) => t.type === type && t.assetId === assetId && t.from === from && t.to === to
  )
  const transfer = transfers?.[index]

  if (transfer) {
    transfer.totalValue = new BigNumber(transfer.totalValue).plus(value).toString(10)
    transfer.components.push({ value })
    transfers[index] = transfer
  } else {
    transfers = [
      ...transfers,
      {
        type,
        assetId,
        from,
        to,
        totalValue: value,
        components: [{ value }],
        token
      }
    ]
  }

  return transfers
}

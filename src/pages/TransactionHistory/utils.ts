import type { AssetId } from '@shapeshiftoss/caip'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { BigAmount } from '@shapeshiftoss/utils'

import { getTransfersByType } from '@/components/TransactionHistoryRows/utils'
import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'

export type ReportLeg = {
  sentAmount: string
  sentCurrency: string
  sentAddresses: string
  receivedAmount: string
  receivedCurrency: string
  receivedAddresses: string
}

export const toAmount = (value: string, precision: number): string =>
  BigAmount.fromBaseUnit({ value, precision }).toPrecision()

const toAddresses = (addresses: string[] | undefined): string => addresses?.join(', ') ?? ''

const toLeg = (send?: Transfer, receive?: Transfer): ReportLeg => ({
  sentAmount: send ? toAmount(send.value, send.asset.precision) : '',
  sentCurrency: send?.asset.symbol ?? '',
  sentAddresses: toAddresses((send ?? receive)?.from),
  receivedAmount: receive ? toAmount(receive.value, receive.asset.precision) : '',
  receivedCurrency: receive?.asset.symbol ?? '',
  receivedAddresses: toAddresses((receive ?? send)?.to),
})

// A fee-asset leg beside token legs is a protocol fee or a refund, so tokens pair first
const sortTokensFirst = (transfers: Transfer[], feeAssetId: AssetId | undefined): Transfer[] =>
  [...transfers].sort((a, b) => Number(a.assetId === feeAssetId) - Number(b.assetId === feeAssetId))

export const getReportLegs = (
  transfers: Transfer[],
  feeAssetId: AssetId | undefined,
): ReportLeg[] => {
  const { Send = [], Receive = [] } = getTransfersByType(transfers, [
    TransferType.Send,
    TransferType.Receive,
  ])
  const unpairedReceives = sortTokensFirst(Receive, feeAssetId)

  // A same-asset pair is a transfer, not a trade, so each side keeps its own leg
  const legs = sortTokensFirst(Send, feeAssetId).map(send => {
    const i = unpairedReceives.findIndex(receive => receive.assetId !== send.assetId)
    const receive = i >= 0 ? unpairedReceives.splice(i, 1)[0] : undefined
    return toLeg(send, receive)
  })

  legs.push(...unpairedReceives.map(receive => toLeg(undefined, receive)))

  return legs.length ? legs : [toLeg()]
}

// Koinly and CoinTracker expect YYYY-MM-DD HH:mm:ss in UTC
export const toReportDate = (blockTime: number): string =>
  new Date(blockTime * 1000).toISOString().slice(0, 19).replace('T', ' ')

// RFC 4180 quoting, plus a leading apostrophe so a token symbol cannot run as a spreadsheet formula
export const toCsvCell = (value: string): string => {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

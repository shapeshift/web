import { fromAssetId } from '@shapeshiftoss/caip'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { BigAmount, chainIdToFeeAssetId } from '@shapeshiftoss/utils'

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

const toAmount = (transfer: Transfer): string =>
  BigAmount.fromBaseUnit({
    value: transfer.value,
    precision: transfer.asset.precision,
  }).toPrecision()

const toAddresses = (addresses: string[] | undefined): string =>
  addresses ? `"${addresses.join('\n')}"` : ''

const isFeeAsset = (transfer: Transfer): boolean =>
  transfer.assetId === chainIdToFeeAssetId(fromAssetId(transfer.assetId).chainId)

// A fee-asset leg beside token legs is a protocol fee or a refund, so tokens pair first
const sortTokensFirst = (transfers: Transfer[]): Transfer[] =>
  [...transfers].sort((a, b) => Number(isFeeAsset(a)) - Number(isFeeAsset(b)))

const toLeg = (send?: Transfer, receive?: Transfer): ReportLeg => ({
  sentAmount: send ? toAmount(send) : '',
  sentCurrency: send?.asset.symbol ?? '',
  sentAddresses: toAddresses((send ?? receive)?.from),
  receivedAmount: receive ? toAmount(receive) : '',
  receivedCurrency: receive?.asset.symbol ?? '',
  receivedAddresses: toAddresses((receive ?? send)?.to),
})

export const getReportLegs = (transfers: Transfer[]): ReportLeg[] => {
  const { Send = [], Receive = [] } = getTransfersByType(transfers, [
    TransferType.Send,
    TransferType.Receive,
  ])
  const unpairedReceives = sortTokensFirst(Receive)

  // A same-asset pair is a transfer, not a trade, so each side keeps its own leg
  const legs = sortTokensFirst(Send).map(send => {
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

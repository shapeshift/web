import { ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
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

const toAmount = (transfer: Transfer): string =>
  BigAmount.fromBaseUnit({
    value: transfer.value,
    precision: transfer.asset.precision,
  }).toPrecision()

const toAddresses = (addresses: string[] | undefined): string =>
  addresses ? `"${addresses.join('\n')}"` : ''

const isNativeAsset = (transfer: Transfer): boolean =>
  fromAssetId(transfer.assetId).assetNamespace === ASSET_NAMESPACE.slip44

// A native send alongside token sends is a protocol fee, so pair the tokens with the receives first
const sortTokensFirst = (sends: Transfer[]): Transfer[] =>
  [...sends].sort((a, b) => Number(isNativeAsset(a)) - Number(isNativeAsset(b)))

// One leg per sent/received pair, the shape tax tools import; surplus legs carry one side only
export const getReportLegs = (transfers: Transfer[]): ReportLeg[] => {
  const { Send = [], Receive = [] } = getTransfersByType(transfers, [
    TransferType.Send,
    TransferType.Receive,
  ])
  const sends = sortTokensFirst(Send)
  const legCount = Math.max(sends.length, Receive.length, 1)

  return Array.from({ length: legCount }, (_, i) => {
    const send = sends[i]
    const receive = Receive[i]

    return {
      sentAmount: send ? toAmount(send) : '',
      sentCurrency: send?.asset.symbol ?? '',
      sentAddresses: toAddresses((send ?? receive)?.from),
      receivedAmount: receive ? toAmount(receive) : '',
      receivedCurrency: receive?.asset.symbol ?? '',
      receivedAddresses: toAddresses((receive ?? send)?.to),
    }
  })
}

// Koinly and CoinTracker expect YYYY-MM-DD HH:mm:ss in UTC
export const toReportDate = (blockTime: number): string =>
  new Date(blockTime * 1000).toISOString().slice(0, 19).replace('T', ' ')

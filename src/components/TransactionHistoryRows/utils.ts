import { MaxUint256 } from '@ethersproject/constants'
import type { TransferType, TxMetadata } from '@shapeshiftoss/chain-adapters'
import type { MarketData } from '@shapeshiftoss/types'
import { memoize } from 'lodash'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { priceAtDate } from 'lib/charts'
import type { PriceHistoryData } from 'state/slices/marketDataSlice/types'

export const getTxMetadataWithAssetId = (txMetadata?: TxMetadata) => {
  if (txMetadata && 'assetId' in txMetadata) return txMetadata
}

export const getTransfersByType = (
  transfers: Transfer[],
  types: TransferType[],
): Record<TransferType, Transfer[]> =>
  types.reduce((prev, type) => {
    const transfersByType = transfers.filter(t => t.type === type)
    if (!transfersByType.length) return prev
    prev[type] = transfersByType
    return prev
  }, {} as Record<TransferType, Transfer[]>)

type GetTradeFeesInput = {
  buy: Transfer
  sell: Transfer
  blockTime: number
  cryptoPriceHistoryData?: PriceHistoryData
}

export type TradeFees = {
  value: string
  asset: Asset
}

export const getTradeFees = memoize(
  ({ sell, buy, blockTime, cryptoPriceHistoryData }: GetTradeFeesInput): TradeFees | undefined => {
    const sellAssetPriceHistoryData = cryptoPriceHistoryData?.[sell.asset.assetId]
    const buyAssetPriceHistoryData = cryptoPriceHistoryData?.[buy.asset.assetId]

    if (!sellAssetPriceHistoryData || !buyAssetPriceHistoryData) return

    const sellAssetPriceAtDate = priceAtDate({
      date: blockTime,
      priceHistoryData: sellAssetPriceHistoryData,
    })

    const buyAssetPriceAtDate = priceAtDate({
      date: blockTime,
      priceHistoryData: buyAssetPriceHistoryData,
    })

    if (bn(sellAssetPriceAtDate).isZero() || bn(buyAssetPriceAtDate).isZero()) return

    const sellAmountFiat = bnOrZero(sell.value)
      .div(bn(10).pow(sell.asset.precision))
      .times(bnOrZero(sellAssetPriceAtDate))

    const buyAmountFiat = bnOrZero(buy.value)
      .div(bn(10).pow(buy.asset.precision))
      .times(bnOrZero(buyAssetPriceAtDate))

    const sellTokenFee = sellAmountFiat.minus(buyAmountFiat).div(sellAssetPriceAtDate)

    return {
      asset: sell.asset,
      value: sellTokenFee.toString(),
    }
  },
)

export const makeAmountOrDefault = (
  value: string,
  approvedAssetMarketData: MarketData | undefined,
  approvedAsset: Asset | undefined,
  parser: TxMetadata['parser'] | undefined,
) => {
  // An obvious revoke i.e a 0-value approve() Tx
  if (bn(value).isZero()) return `transactionRow.parser.${parser}.revoke`

  // Unavailable assets
  if (!approvedAsset || !approvedAssetMarketData)
    return `transactionRow.parser.${parser}.amountUnavailable`

  const approvedAmount = bn(value).div(bn(10).pow(approvedAsset.precision)).toString()

  // If equal to max. Solidity uint256 value or greater than/equal to max supply, we can infer infinite approvals without market data
  if (
    (approvedAssetMarketData.maxSupply &&
      bn(approvedAssetMarketData.maxSupply).gte(0) &&
      bn(approvedAmount).gte(approvedAssetMarketData.maxSupply)) ||
    bn(value).isEqualTo(MaxUint256.toString())
  )
    return `transactionRow.parser.${parser}.infinite`
  // We don't have market data for that asset thus can't know whether or not it's infinite
  if (bnOrZero(approvedAssetMarketData.supply).isZero()) return approvedAmount
  // We have market data and the approval is greater than it, so we can assume it's infinite
  if (bn(approvedAmount).gte(approvedAssetMarketData.supply ?? '0'))
    return `transactionRow.parser.${parser}.infinite`

  // All above infinite/revoke checks failed, this is an exact approval
  return `${approvedAmount} ${approvedAsset.symbol}`
}

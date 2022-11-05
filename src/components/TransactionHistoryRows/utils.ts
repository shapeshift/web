import { MaxUint256 } from '@ethersproject/constants'
import type { Asset } from '@keepkey/asset-service'
import type { TxMetadata } from '@keepkey/chain-adapters'
import type { MarketData } from '@keepkey/types'
import { memoize } from 'lodash'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { priceAtDate } from 'lib/charts'
import type { PriceHistoryData } from 'state/slices/marketDataSlice/marketDataSlice'

export enum AssetTypes {
  Source = 'source',
  Destination = 'destination',
  Fee = 'fee',
}

const fallback = {
  symbol: ' N/A',
  precision: 18,
}

export const getTxMetadataWithAssetId = (txMetadata?: TxMetadata) => {
  if (txMetadata && 'assetId' in txMetadata) return txMetadata
}

export const parseRelevantAssetFromTx = (txDetails: TxDetails, assetType: AssetTypes | null) => {
  switch (assetType) {
    case AssetTypes.Source:
      return {
        assetId: txDetails.sellAsset?.assetId ?? '',
        symbol: txDetails.sellAsset?.symbol ?? fallback.symbol,
        amount: txDetails.sellTransfer?.value ?? '0',
        precision: txDetails.sellAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.sourceMarketData?.price,
        icon: txDetails.sellAsset?.icon,
      }
    case AssetTypes.Destination:
      return {
        assetId: txDetails.buyAsset?.assetId ?? '',
        symbol: txDetails.buyAsset?.symbol ?? fallback.symbol,
        amount: txDetails.buyTransfer?.value ?? '0',
        precision: txDetails.buyAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.destinationMarketData?.price,
        icon: txDetails.buyAsset?.icon,
      }
    case AssetTypes.Fee:
      return {
        assetId: txDetails.feeAsset?.assetId ?? '',
        symbol: txDetails.feeAsset?.symbol ?? fallback.symbol,
        amount: txDetails.tx.fee?.value ?? '0',
        precision: txDetails.feeAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.feeMarketData?.price,
        icon: txDetails.feeAsset?.icon,
      }
    default:
      return {
        assetId: undefined,
        symbol: txDetails.symbol ?? fallback.symbol,
        amount: txDetails.value ?? '0',
        precision: txDetails.precision ?? fallback.precision,
        currentPrice: undefined,
      }
  }
}

type GetTradeFeesInput = {
  buyAsset: Asset
  sellAsset: Asset
  buyAmount: string
  sellAmount: string
  blockTime: number
  cryptoPriceHistoryData: PriceHistoryData
}
export const getTradeFees = memoize(
  ({
    sellAsset,
    buyAsset,
    buyAmount,
    sellAmount,
    blockTime,
    cryptoPriceHistoryData,
  }: GetTradeFeesInput) => {
    const sellAssetPriceHistoryData = cryptoPriceHistoryData[sellAsset.assetId]
    const buyAssetPriceHistoryData = cryptoPriceHistoryData[buyAsset.assetId]

    if (!sellAssetPriceHistoryData || !buyAssetPriceHistoryData) return null

    const sellAssetPriceAtDate = priceAtDate({
      date: blockTime,
      priceHistoryData: sellAssetPriceHistoryData,
    })

    const buyAssetPriceAtDate = priceAtDate({
      date: blockTime,
      priceHistoryData: buyAssetPriceHistoryData,
    })

    if (bn(sellAssetPriceAtDate).isZero() || bn(buyAssetPriceAtDate).isZero()) return null

    const sellAmountFiat = bnOrZero(sellAmount)
      .div(bn(10).pow(sellAsset.precision))
      .times(bnOrZero(sellAssetPriceAtDate))

    const buyAmountFiat = bnOrZero(buyAmount)
      .div(bn(10).pow(buyAsset.precision))
      .times(bnOrZero(buyAssetPriceAtDate))

    const sellTokenFee = sellAmountFiat.minus(buyAmountFiat).div(sellAssetPriceAtDate)

    return sellTokenFee.toString()
  },
)

export const makeAmountOrDefault = (
  value: string,
  approvedAssetMarketData: MarketData,
  approvedAsset: Asset,
  parser: TxMetadata['parser'] | undefined,
) => {
  // An obvious revoke i.e a 0-value approve() Tx
  if (bn(value).isZero()) return `transactionRow.parser.${parser}.revoke`

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

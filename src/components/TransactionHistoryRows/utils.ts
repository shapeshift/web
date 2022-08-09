import { Asset } from '@shapeshiftoss/asset-service'
import { cosmos, evm, TransactionMetadata } from '@shapeshiftoss/chain-adapters'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { memoize } from 'lodash'
import { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { priceAtDate } from 'lib/charts'
import { PriceHistoryData } from 'state/slices/marketDataSlice/marketDataSlice'

export enum AssetTypes {
  Source = 'source',
  Destination = 'destination',
  Fee = 'fee',
}

const fallback = {
  symbol: ' N/A',
  precision: 18,
}

export const isTokenMetadata = (
  txMetadata:
    | TransactionMetadata
    | evm.TransactionMetadata
    | cosmos.TransactionMetadata
    | undefined,
): txMetadata is evm.TransactionMetadata | cosmos.TransactionMetadata =>
  Boolean(
    txMetadata && (txMetadata as evm.TransactionMetadata | cosmos.TransactionMetadata).assetId,
  )

export const parseRelevantAssetFromTx = (txDetails: TxDetails, assetType: AssetTypes | null) => {
  switch (assetType) {
    case AssetTypes.Source:
      return {
        symbol: txDetails.sellAsset?.symbol ?? fallback.symbol,
        amount: txDetails.sellTransfer?.value ?? '0',
        precision: txDetails.sellAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.sourceMarketData?.price,
        icon: txDetails.sellAsset?.icon,
      }
    case AssetTypes.Destination:
      return {
        symbol: txDetails.buyAsset?.symbol ?? fallback.symbol,
        amount: txDetails.buyTransfer?.value ?? '0',
        precision: txDetails.buyAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.destinationMarketData?.price,
        icon: txDetails.buyAsset?.icon,
      }
    case AssetTypes.Fee:
      return {
        symbol: txDetails.feeAsset?.symbol ?? fallback.symbol,
        amount: txDetails.tx.fee?.value ?? '0',
        precision: txDetails.feeAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.feeMarketData?.price,
        icon: txDetails.feeAsset?.icon,
      }
    default:
      return {
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

    const sellAmountFiat = bnOrZero(sellAmount)
      .div(`1e+${sellAsset.precision}`)
      .times(bnOrZero(sellAssetPriceAtDate))

    const buyAmountFiat = bnOrZero(buyAmount)
      .div(`1e+${buyAsset.precision}`)
      .times(bnOrZero(buyAssetPriceAtDate))

    const sellTokenFee = sellAmountFiat.minus(buyAmountFiat).div(sellAssetPriceAtDate)

    return sellTokenFee.toString()
  },
)

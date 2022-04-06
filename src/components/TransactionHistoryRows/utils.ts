import { TxDetails } from 'hooks/useTxDetails/useTxDetails'

export enum AssetTypes {
  Source = 'source',
  Destination = 'destination',
  Fee = 'fee'
}

const fallback = {
  symbol: ' N/A',
  precision: 18
}

export const parseRelevantAssetFromTx = (txDetails: TxDetails, assetType: AssetTypes | null) => {
  switch (assetType) {
    case AssetTypes.Source:
      return {
        symbol: txDetails.sellAsset?.symbol ?? fallback.symbol,
        amount: txDetails.sellTransfer?.value ?? '0',
        precision: txDetails.sellAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.sourceMarketData?.price
      }
    case AssetTypes.Destination:
      return {
        symbol: txDetails.buyAsset?.symbol ?? fallback.symbol,
        amount: txDetails.buyTransfer?.value ?? '0',
        precision: txDetails.buyAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.destinationMarketData?.price
      }
    case AssetTypes.Fee:
      return {
        symbol: txDetails.feeAsset?.symbol ?? fallback.symbol,
        amount: txDetails.tx.fee?.value ?? '0',
        precision: txDetails.feeAsset?.precision ?? fallback.precision,
        currentPrice: txDetails.feeMarketData?.price
      }
    default:
      return {
        symbol: txDetails.symbol ?? fallback.symbol,
        amount: txDetails.value ?? '0',
        precision: txDetails.precision ?? fallback.precision,
        currentPrice: undefined
      }
  }
}

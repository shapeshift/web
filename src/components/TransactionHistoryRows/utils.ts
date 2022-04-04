import { TxDetails } from 'hooks/useTxDetails/useTxDetails'

export enum AssetTypes {
  Source = 'source',
  Destination = 'destination',
  Fee = 'fee'
}

const fallbackValues = {
  symbol: ' N/A',
  precision: 18
}

export const parseRelevantAssetFromTx = (txDetails: TxDetails, assetType: AssetTypes | null) => {
  switch (assetType) {
    case AssetTypes.Source:
      return {
        symbol: txDetails.sellAsset?.symbol ?? fallbackValues.symbol,
        amount: txDetails.sellTransfer?.value ?? '0',
        precision: txDetails.sellAsset?.precision ?? fallbackValues.precision,
        currentPrice: txDetails.sourceMarketData?.price
      }
    case AssetTypes.Destination:
      return {
        symbol: txDetails.buyAsset?.symbol ?? fallbackValues.symbol,
        amount: txDetails.buyTransfer?.value ?? '0',
        precision: txDetails.buyAsset?.precision ?? fallbackValues.precision,
        currentPrice: txDetails.destinationMarketData?.price
      }
    case AssetTypes.Fee:
      return {
        symbol: txDetails.feeAsset?.symbol ?? fallbackValues.symbol,
        amount: txDetails.tx.fee?.value ?? '0',
        precision: txDetails.feeAsset?.precision ?? fallbackValues.precision,
        currentPrice: txDetails.feeMarketData?.price
      }
    default:
      return {
        symbol: txDetails.symbol ?? fallbackValues.symbol,
        amount: txDetails.value ?? '0',
        precision: txDetails.precision ?? fallbackValues.precision,
        currentPrice: undefined
      }
  }
}

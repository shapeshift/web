import { TxDetails } from 'hooks/useTxDetails/useTxDetails'

export enum AssetTypes {
  Source = 'source',
  Destination = 'destination',
  Fee = 'fee'
}

export const parseRelevantAssetFromTx = (txDetails: TxDetails, assetType: AssetTypes | null) => {
  switch (assetType) {
    case AssetTypes.Source:
      return {
        symbol: txDetails.sellAsset?.symbol ?? '',
        amount: txDetails.sellTx?.value ?? '0',
        precision: txDetails.sellAsset?.precision ?? 0,
        currentPrice: txDetails.sourceMarketData?.price
      }
    case AssetTypes.Destination:
      return {
        symbol: txDetails.buyAsset?.symbol ?? '',
        amount: txDetails.buyTx?.value ?? '0',
        precision: txDetails.buyAsset?.precision ?? 0,
        currentPrice: txDetails.destinationMarketData?.price
      }
    case AssetTypes.Fee:
      return {
        symbol: txDetails.feeAsset?.symbol ?? '',
        amount: txDetails.tx.fee?.value ?? '0',
        precision: txDetails.feeAsset?.precision ?? 0,
        currentPrice: txDetails.feeMarketData?.price
      }
    default:
      return {
        symbol: txDetails.symbol,
        amount: txDetails.value ?? '0',
        precision: txDetails.precision,
        currentPrice: undefined
      }
  }
}

export enum FiatRampAction {
  Buy = 'buy',
  Sell = 'sell',
}

export type FiatRampAsset = {
  name: string
  assetId: string
  symbol: string
  imageUrl?: string
  fiatRampCoinId?: string
}

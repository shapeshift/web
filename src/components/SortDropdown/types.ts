export enum SortOptionsKeys {
  APY = 'APY',
  VOLUME = 'Volume',
  MARKET_CAP = 'Market Cap',
  PRICE_CHANGE = 'Price Change',
}

export type SortOption = {
  key: SortOptionsKeys
  label: string
}

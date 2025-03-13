export enum ExpiryOption {
  OneHour = 'oneHour',
  OneDay = 'oneDay',
  ThreeDays = 'threeDays',
  SevenDays = 'sevenDays',
  TwentyEightDays = 'twentyEightDays',
  // TODO: implement custom expiry
  // Custom = 'custom',
}

export enum PriceDirection {
  BuyAssetDenomination = 'buyAssetDenomination',
  SellAssetDenomination = 'sellAssetDenomination',
}

export enum LimitPriceMode {
  Market = 'market',
  CustomValue = 'customValue',
}

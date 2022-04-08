export enum SendRoutes {
  Select = '/send/select',
  Address = '/send/address',
  Details = '/send/details',
  Confirm = '/send/confirm',
  Scan = '/send/scan',
}

export enum SendFormFields {
  Address = 'address',
  EnsName = 'ensName',
  AccountId = 'accountId',
  Asset = 'asset',
  FeeType = 'feeType',
  EstimatedFees = 'estimatedFees',
  CryptoAmount = 'cryptoAmount',
  CryptoSymbol = 'cryptoSymbol',
  FiatAmount = 'fiatAmount',
  FiatSymbol = 'fiatSymbol',
  AmountFieldError = 'amountFieldError',
  SendMax = 'sendMax',
}

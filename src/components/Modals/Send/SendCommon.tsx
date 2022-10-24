export enum SendRoutes {
  Select = '/send/select',
  Address = '/send/address',
  Details = '/send/details',
  Confirm = '/send/confirm',
  Scan = '/send/scan',
}

export enum SendFormFields {
  Input = 'input', // the raw field input on the address input
  Memo = 'memo', // an optional memo, used only on chains supporting it e.g Cosmos SDK chains
  Address = 'address', // a valid on chain address
  VanityAddress = 'vanityAddress', // a vanity address, e.g. .eth or .crypto
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

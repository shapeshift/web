export enum QrCodeRoutes {
  Address = '/qrCode/address',
  Details = '/qrCode/details',
  Confirm = '/qrCode/confirm',
  Select = '/qrCode/select',
  Scan = '/qrCode/scan',
}

export enum SendFormFields {
  Input = 'input', // the raw field input on the address input
  Memo = 'memo', // an optional memo, used only on chains supporting it e.g Cosmos SDK chains
  To = 'to', // a valid on-chain address
  From = 'from', // a valid on-chain address
  VanityAddress = 'vanityAddress', // a vanity address, e.g. .eth or .crypto
  AccountId = 'accountId',
  AssetId = 'assetId',
  FeeType = 'feeType',
  EstimatedFees = 'estimatedFees',
  CryptoAmount = 'cryptoAmount',
  FiatAmount = 'fiatAmount',
  FiatSymbol = 'fiatSymbol',
  AmountFieldError = 'amountFieldError',
  SendMax = 'sendMax',
}

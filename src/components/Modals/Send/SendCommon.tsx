export enum SendRoutes {
  AmountDetails = '/send/amount-details',
  Confirm = '/send/confirm',
  Status = '/send/status',
  Scan = '/send/scan',
  Select = '/send/select',
  Address = '/send/address',
  Amount = '/send/amount',
}

export const sendRoutes = [
  SendRoutes.Confirm,
  SendRoutes.Status,
  SendRoutes.Scan,
  SendRoutes.Select,
  SendRoutes.AmountDetails,
  SendRoutes.Address,
]

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
  AmountCryptoPrecision = 'amountCryptoPrecision',
  FiatAmount = 'fiatAmount',
  FiatSymbol = 'fiatSymbol',
  AmountFieldError = 'amountFieldError',
  SendMax = 'sendMax',
  CustomNonce = 'customNonce',
  TxHash = 'txHash',
  ChangeAddress = 'changeAddress',
}

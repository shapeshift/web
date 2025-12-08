import type { Asset } from '@shapeshiftoss/types'

export type RelayTradeBaseParams = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  affiliateBps: string
}

export type RelayTradeInputParams<T extends 'rate' | 'quote'> = RelayTradeBaseParams & {
  quoteOrRate: T
  receiveAddress: T extends 'rate' ? string | undefined : string
  sendAddress: T extends 'rate' ? undefined : string
  accountNumber: T extends 'rate' ? undefined : number
  slippageTolerancePercentageDecimal?: string
  xpub: string | undefined
}

export type RelayTransactionMetadata = {
  to?: string
  from?: string
  value?: string
  data?: string
  gasLimit?: string
  psbt?: string
  opReturnData?: string
  relayId: string
}

export type RelayStatus = {
  status: 'success' | 'failed' | 'pending' | 'refund' | 'delayed' | 'waiting'
  details?: string
  inTxHashes: string[]
  txHashes: string[]
  time: number
  originChainId: number
  destinationChainId: number
}

export type AppFee = {
  recipient: string
  fee: string
}

export type Transaction = {
  from: string
  to: string
  value: string
  data: string
}

export type RelayFetchQuoteParams<T extends 'quote' | 'rate'> = {
  user: T extends 'quote' ? string : undefined
  originChainId: number
  destinationChainId: number
  originCurrency: string
  destinationCurrency: string
  tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'EXPECTED_OUTPUT'
  recipient?: string
  amount?: string
  referrer?: string
  refundOnOrigin?: boolean
  // Not mandatory on relay side but we keep it mandatory here to avoid
  // losing user funds for UTXOs as we rely on their address to get the quote
  // it would mean there would be a risk of refunding to their own address
  // instead of our user address
  refundTo: string
  slippageTolerance?: string
  appFees?: AppFee[]
}

export type RelayToken = {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
}

export type RelayCurrencyData = {
  currency: RelayToken
  amount: string
  amountFormatted: string
  amountUsd: string
  minimumAmount: string
}

export type RelayFees = {
  gas: RelayCurrencyData
  relayer: RelayCurrencyData
  app: RelayCurrencyData
}

export type QuoteDetails = {
  currencyOut: RelayCurrencyData
  rate: string
  slippageTolerance: {
    origin: {
      percent: string
    }
    destination: {
      percent: string
    }
  }
  timeEstimate: number
}

export type RelayQuoteEvmItemData = {
  to?: string
  data?: string
  value?: string
  gas?: string
}

export type RelayQuoteUtxoItemData = {
  psbt?: string
  to?: string
  opReturnData?: string
}

export type RelayQuoteSolanaItemData = {
  instructions: RelaySolanaInstruction[]
  addressLookupTableAddresses: string[]
}

export type RelayQuoteTronItemData = {
  type?: string
  parameter?: {
    owner_address?: string
    contract_address?: string
    data?: string
  }
}

export type RelayQuoteItem = {
  data?:
    | RelayQuoteEvmItemData
    | RelayQuoteUtxoItemData
    | RelayQuoteSolanaItemData
    | RelayQuoteTronItemData
}

export type RelayQuoteStep = {
  id: string
  requestId: string
  items?: RelayQuoteItem[]
}

export type RelayQuote = {
  fees: RelayFees
  details: QuoteDetails
  steps: RelayQuoteStep[]
}

export const isRelayQuoteUtxoItemData = (
  item:
    | RelayQuoteUtxoItemData
    | RelayQuoteEvmItemData
    | RelayQuoteSolanaItemData
    | RelayQuoteTronItemData,
): item is RelayQuoteUtxoItemData => {
  return 'psbt' in item
}

export const isRelayQuoteEvmItemData = (
  item:
    | RelayQuoteUtxoItemData
    | RelayQuoteEvmItemData
    | RelayQuoteSolanaItemData
    | RelayQuoteTronItemData,
): item is RelayQuoteEvmItemData => {
  return 'to' in item && 'data' in item && 'value' in item
}

export const isRelayQuoteSolanaItemData = (
  item:
    | RelayQuoteUtxoItemData
    | RelayQuoteEvmItemData
    | RelayQuoteSolanaItemData
    | RelayQuoteTronItemData,
): item is RelayQuoteSolanaItemData => {
  return 'instructions' in item
}

export const isRelayQuoteTronItemData = (
  item:
    | RelayQuoteUtxoItemData
    | RelayQuoteEvmItemData
    | RelayQuoteSolanaItemData
    | RelayQuoteTronItemData,
): item is RelayQuoteTronItemData => {
  return 'type' in item && 'parameter' in item
}

export type RelaySolanaInstruction = {
  keys: {
    pubkey: string
    isSigner: boolean
    isWritable: boolean
  }[]
  data: string
  programId: string
}

export enum RelayErrorCode {
  AmountTooLow = 'AMOUNT_TOO_LOW',
  ChainDisabled = 'CHAIN_DISABLED',
  Erc20RouterAddressNotFound = 'ERC20_ROUTER_ADDRESS_NOT_FOUND',
  ExtraTransactionsNotSupported = 'EXTRA_TXS_NOT_SUPPORTED',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  InsufficientLiquidity = 'INSUFFICIENT_LIQUIDITY',
  InvalidAddress = 'INVALID_ADDRESS',
  InvalidExtraTransactions = 'INVALID_EXTRA_TXS',
  NoQuotes = 'NO_QUOTES',
  NoSwapRoutesFound = 'NO_SWAP_ROUTES_FOUND',
  PermitFailed = 'PERMIT_FAILED',
  SwapImpactTooHigh = 'SWAP_IMPACT_TOO_HIGH',
  SwapQuoteFailed = 'SWAP_QUOTE_FAILED',
  Unauthorized = 'UNAUTHORIZED',
  UnknownError = 'UNKNOWN_ERROR',
  UnsupportedChain = 'UNSUPPORTED_CHAIN',
  UnsupportedCurrency = 'UNSUPPORTED_CURRENCY',
  UnsupportedExecutionType = 'UNSUPPORTED_EXECUTION_TYPE',
  UnsupportedRoute = 'UNSUPPORTED_ROUTE',
  UserRecipientMismatch = 'USER_RECIPIENT_MISMATCH',
}

export type RelayError = {
  errorCode: RelayErrorCode
  message: string
}

export const isRelayError = (error: unknown): error is RelayError => {
  return typeof error === 'object' && error !== null && 'errorCode' in error && 'message' in error
}

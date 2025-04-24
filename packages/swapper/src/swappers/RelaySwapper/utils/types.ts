import type { Asset } from '@shapeshiftoss/types'

export type RelayTradeBaseParams = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  affiliateBps: string
  potentialAffiliateBps: string
}

export type RelayTradeInputParams<T extends 'rate' | 'quote'> = RelayTradeBaseParams & {
  quoteOrRate: T
  receiveAddress: T extends 'rate' ? string | undefined : string
  sendAddress: T extends 'rate' ? undefined : string
  accountNumber: T extends 'rate' ? undefined : number
  slippageTolerancePercentageDecimal?: string
}

export type RelayTransactionMetadata = {
  to?: string
  value?: string
  data?: string
  gasLimit?: string
  psbt?: string
  opReturnData?: string
}

export type RelayStatus = {
  status: 'success' | 'failed' | 'pending' | 'refund' | 'delayed' | 'waiting'
  details: string
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

export type RelayQuoteItem = {
  data?: RelayQuoteEvmItemData | RelayQuoteUtxoItemData | RelayQuoteSolanaItemData
}

export type RelayQuote = {
  fees: RelayFees
  details: QuoteDetails
  steps: {
    id: string
    requestId: string
    items?: RelayQuoteItem[]
  }[]
}

export const isRelayQuoteUtxoItemData = (
  item: RelayQuoteUtxoItemData | RelayQuoteEvmItemData | RelayQuoteSolanaItemData,
): item is RelayQuoteUtxoItemData => {
  return 'psbt' in item
}

export const isRelayQuoteEvmItemData = (
  item: RelayQuoteUtxoItemData | RelayQuoteEvmItemData | RelayQuoteSolanaItemData,
): item is RelayQuoteEvmItemData => {
  return 'to' in item && 'data' in item && 'value' in item && 'gas' in item
}

export const isRelayQuoteSolanaItemData = (
  item: RelayQuoteUtxoItemData | RelayQuoteEvmItemData | RelayQuoteSolanaItemData,
): item is RelayQuoteSolanaItemData => {
  return 'instructions' in item
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

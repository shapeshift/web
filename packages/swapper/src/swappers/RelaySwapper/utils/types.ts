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
  to: string | undefined
  value: string | undefined
  data: string | undefined
  gasLimit: string | undefined
}

export type RelayStatus = {
  status: 'success' | 'failed' | 'pending' | 'refund' | 'delayed' | 'waiting'
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

export type RelayQuoteItemData = {
  to?: string
  data?: string
  value?: string
  gas?: string
}

// @TODO: Change this to EVM and add UTXO/SVM types
export type RelayQuoteItem = {
  data?: RelayQuoteItemData
}

export type RelayQuote = {
  fees: RelayFees
  details: QuoteDetails
  steps: {
    id: string
    requestId?: string
    items?: RelayQuoteItem[]
  }[]
}

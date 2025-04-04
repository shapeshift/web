import type { Asset } from '@shapeshiftoss/types'
import type { Address } from 'viem'

export type RelayTradeInputParams<T extends 'rate' | 'quote'> = {
  buyAsset: Asset
  receiveAddress: T extends 'rate' ? string | undefined : string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: T extends 'rate' ? undefined : string
  quoteOrRate: T
  accountNumber: T extends 'rate' ? undefined : number
  affiliateBps: string
  potentialAffiliateBps: string
  slippageTolerancePercentageDecimal?: string
}

export type RelayTradeRateParams = {
  buyAsset: Asset
  receiveAddress: string | undefined
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: undefined
  quoteOrRate: 'rate'
  accountNumber: undefined
  affiliateBps: string
  potentialAffiliateBps: string
}

export type RelayTradeQuoteParams = {
  buyAsset: Asset
  receiveAddress: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  sendAddress: string
  quoteOrRate: 'quote'
  accountNumber: number
  affiliateBps: string
  potentialAffiliateBps: string
}

export type RelayTransactionMetadata = {
  to: Address | undefined
  value: string | undefined
  data: string | undefined
  gas: string | undefined
  maxFeePerGas: string | undefined
  maxPriorityFeePerGas: string | undefined
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

export type QuoteParams<T extends 'quote' | 'rate'> = {
  user: T extends 'quote' ? string : undefined
  originChainId: number
  destinationChainId: number
  originCurrency: string
  destinationCurrency: string
  tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'EXPECTED_OUTPUT'
  recipient?: string
  amount?: string
  txs?: Transaction[]
  referrer?: string
  refundTo?: string
  refundOnOrigin?: boolean
  useReceiver?: boolean
  useExternalLiquidity?: boolean
  usePermit?: boolean
  useDepositAddress?: boolean
  slippageTolerance?: string
  appFees?: AppFee[]
  gasLimitForDepositSpecifiedTxs?: number
  userOperationGasOverhead?: number
  forceSolverExecution?: boolean
}

export type RelayToken = {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
  metadata: {
    logoURI: string
    verified: boolean
    isNative: boolean
  }
}

export const isValidRelayToken = (token: Record<string, unknown>): token is RelayToken => {
  return Boolean(token.chainId && token.address && token.symbol && token.name && token.decimals)
}

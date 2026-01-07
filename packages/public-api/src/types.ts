import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { SwapperName, TradeQuote, TradeRate, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'

// Partner configuration
export type PartnerConfig = {
  id: string
  apiKeyHash: string
  name: string
  feeSharePercentage: number
  status: 'active' | 'suspended' | 'pending'
  rateLimit: {
    requestsPerMinute: number
    requestsPerDay: number
  }
  createdAt: Date
}

// API Request Types
export type RatesRequest = {
  sellAssetId: AssetId
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  slippageTolerancePercentageDecimal?: string
  allowMultiHop?: boolean
}

export type QuoteRequest = {
  sellAssetId: AssetId
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  receiveAddress: string
  sendAddress?: string
  swapperName: SwapperName
  slippageTolerancePercentageDecimal?: string
  allowMultiHop?: boolean
  accountNumber?: number
}

export type StatusRequest = {
  txHash: string
  chainId: ChainId
  swapperName: SwapperName
}

// API Response Types
export type ApiRate = {
  swapperName: SwapperName
  rate: string
  buyAmountCryptoBaseUnit: string
  sellAmountCryptoBaseUnit: string
  steps: number
  estimatedExecutionTimeMs: number | undefined
  priceImpactPercentageDecimal: string | undefined
  affiliateBps: string
  networkFeeCryptoBaseUnit: string | undefined
  error?: {
    code: TradeQuoteError
    message: string
  }
}

export type RatesResponse = {
  rates: ApiRate[]
  timestamp: number
  expiresAt: number
}

export type ApiQuoteStep = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  allowanceContract: string
  estimatedExecutionTimeMs: number | undefined
  source: string
  transactionData?: {
    to: string
    data: string
    value: string
    gasLimit?: string
  }
}

export type ApprovalInfo = {
  isRequired: boolean
  spender: string
  approvalTx?: {
    to: string
    data: string
    value: string
  }
}

export type QuoteResponse = {
  quoteId: string
  swapperName: SwapperName
  rate: string
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  buyAmountBeforeFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  affiliateBps: string
  slippageTolerancePercentageDecimal: string | undefined
  networkFeeCryptoBaseUnit: string | undefined
  steps: ApiQuoteStep[]
  approval: ApprovalInfo
  expiresAt: number
  quote: TradeQuote | TradeRate
}

export type StatusResponse = {
  status: 'pending' | 'confirmed' | 'failed' | 'unknown'
  sellTxHash: string
  buyTxHash?: string
  message?: string
}

export type AssetsResponse = {
  assets: Asset[]
  timestamp: number
}

export type ErrorResponse = {
  error: string
  code?: string
  details?: unknown
}

// Extend Express Request to include partner info
declare global {
  namespace Express {
    interface Request {
      partner?: PartnerConfig
    }
  }
}

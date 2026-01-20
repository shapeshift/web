import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { SwapperName, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { TypedData } from 'eip-712'

export type Permit2SignatureRequired = {
  type: 'permit2'
  eip712: TypedData
}

export type EvmTransactionData = {
  type: 'evm'
  chainId: number
  to: string
  data: string
  value: string
  gasLimit?: string
  signatureRequired?: Permit2SignatureRequired
}

export type SolanaTransactionData = {
  type: 'solana'
  instructions: {
    programId: string
    keys: {
      pubkey: string
      isSigner: boolean
      isWritable: boolean
    }[]
    data: string
  }[]
  addressLookupTableAddresses: string[]
}

export type UtxoPsbtTransactionData = {
  type: 'utxo_psbt'
  psbt: string
  opReturnData?: string
}

export type UtxoDepositTransactionData = {
  type: 'utxo_deposit'
  depositAddress: string
  memo: string
  value: string
}

export type UtxoTransactionData = UtxoPsbtTransactionData | UtxoDepositTransactionData

export type CosmosTransactionData = {
  type: 'cosmos'
  chainId: string
  to: string
  value: string
  memo?: string
}

export type CowswapOrderData = {
  type: 'cowswap'
  order: unknown
  signatureRequired: {
    type: 'eip712'
    eip712: TypedData
  }
}

export type TransactionData =
  | EvmTransactionData
  | SolanaTransactionData
  | UtxoTransactionData
  | CosmosTransactionData
  | CowswapOrderData

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
  transactionData?: TransactionData
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

export type ChainType =
  | 'evm'
  | 'utxo'
  | 'cosmos'
  | 'solana'
  | 'tron'
  | 'sui'
  | 'near'
  | 'starknet'
  | 'ton'

export type Chain = {
  chainId: ChainId
  name: string
  type: ChainType
  symbol: string
  precision: number
  color: string
  networkColor?: string
  icon?: string
  networkIcon?: string
  explorer: string
  explorerAddressLink: string
  explorerTxLink: string
  nativeAssetId: AssetId
}

export type ChainsResponse = {
  chains: Chain[]
  timestamp: number
}

export type ChainCountResponse = {
  count: number
  timestamp: number
}

export type ErrorResponse = {
  error: string
  code?: string
  details?: unknown
}

declare global {
  namespace Express {
    interface Request {
      partner?: PartnerConfig
    }
  }
}

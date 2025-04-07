import type { Asset } from '@shapeshiftoss/types'
import type { AxiosRequestConfig } from 'axios'

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
  to: string | undefined
  value: string | undefined
  data: string | undefined
  gasAmountBaseUnit: string | undefined
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

export type CallFees = {
  gas: {
    currency: RelayToken
    amount: string
    amountFormatted: string
    amountUsd: string
    minimumAmount: string
  }
  relayer: {
    currency: RelayToken
    amount: string
    amountFormatted: string
    amountUsd: string
    minimumAmount: string
  }
  relayerGas: {
    currency: RelayToken
    amount: string
    amountFormatted: string
    amountUsd: string
    minimumAmount: string
  }
  relayerService: {
    currency: RelayToken
    amount: string
    amountFormatted: string
    amountUsd: string
    minimumAmount: string
  }
  app: {
    currency: RelayToken
    amount: string
    amountFormatted: string
    amountUsd: string
    minimumAmount: string
  }
}

export type QuoteDetails = {
  currencyIn: {
    currency: RelayToken
    amount: string
    amountFormatted: string
    amountUsd: string
    minimumAmount: string
  }
  currencyOut: {
    currency: RelayToken
    amount: string
    amountFormatted: string
    amountUsd: string
    minimumAmount: string
  }
  totalImpact: {
    usd: string
    percent: string
  }
  rate: string
  slippageTolerance: {
    origin: {
      usd: string
      value: string
      percent: string
    }
    destination: {
      usd: string
      value: string
      percent: string
    }
  }
  timeEstimate: number
  userBalance: string
}

// https://github.com/reservoirprotocol/relay-kit/blob/main/packages/sdk/src/types/Execute.ts
export type Execute = {
  errors?: {
    message?: string
    orderId?: string
  }[]
  fees: CallFees
  details: QuoteDetails
  error?: any
  refunded?: boolean
  steps: {
    error?: string
    errorData?: any
    action: string
    description: string
    kind: 'transaction' | 'signature'
    id: string
    requestId?: string
    depositAddress?: string
    items?: {
      status: 'complete' | 'incomplete'
      // @TODO: Add instructions and addressLookupTableAddresses for Solana
      // and psbt for UTXO
      data: {
        from?: string
        to?: string
        data?: string
        value?: string
        chainId?: number
        gas?: string
        maxFeePerGas?: string
        maxPriorityFeePerGas?: string
        depositAddress?: string
      }
      orderIndexes: number[]
      orderIds: string[]
      error?: string
      txHashes?: {
        txHash: string
        chainId: number
        isBatchTx?: boolean
      }[]
      internalTxHashes?: {
        txHash: string
        chainId: number
        isBatchTx?: boolean
      }[]
      errorData?: any
      orderData?: {
        crossPostingOrderId?: string
        orderId: string
        orderIndex: string
      }[]
      isValidatingSignature?: boolean
    }[]
  }[]
  request?: AxiosRequestConfig
}

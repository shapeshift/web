import type { Execute } from '@reservoir0x/relay-sdk'
import type { Address } from 'viem'

import type { TradeQuote, TradeRate } from '../../../types'

export interface RelayTradeQuote extends TradeQuote {
  selectedRelayRoute?: Execute
}
export interface RelayTradeRate extends TradeRate {
  selectedRelayRoute?: Execute
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

export type QuoteParams = {
  user: string
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

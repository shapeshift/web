import type { SwapperName, TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import type { ApiQuote } from 'state/apis/swapper/types'

export type ActiveQuoteMeta = { swapperName: SwapperName; identifier: string }

export type TradeQuoteSliceState = {
  activeStep: number | undefined // Make sure to actively check for undefined vs. falsy here. 0 is the first step, undefined means no active step yet
  activeQuoteMeta: ActiveQuoteMeta | undefined // the selected quote metadata used to find the active quote in the api responses
  confirmedQuote: TradeQuote | TradeRate | undefined // the quote being executed
  tradeExecution: Record<TradeQuote['id'], TradeExecutionMetadata>
  tradeQuotes: PartialRecord<SwapperName, Record<string, ApiQuote>> // mapping from swapperName to quoteId to ApiQuote
  tradeQuoteDisplayCache: ApiQuote[]
  isTradeQuoteRequestAborted: boolean // used to conditionally render results and loading state
}

export enum TransactionExecutionState {
  AwaitingConfirmation = 'AwaitingConfirmation',
  Pending = 'Pending',
  Complete = 'Complete',
  Failed = 'Failed',
}

export enum HopExecutionState {
  Pending = 'Pending',
  AwaitingAllowanceReset = 'AwaitingAllowanceReset',
  AwaitingAllowanceApproval = 'AwaitingAllowanceApproval',
  AwaitingPermit2Eip712Sign = 'AwaitingPermit2Eip712Sign',
  AwaitingSwap = 'AwaitingSwap',
  Complete = 'Complete',
}

export enum TradeExecutionState {
  Initializing = 'Initializing',
  Previewing = 'Previewing',
  FirstHop = 'FirstHop',
  SecondHop = 'SecondHop',
  TradeComplete = 'Complete',
}

export enum HopKey {
  FirstHop = 'firstHop',
  SecondHop = 'secondHop',
}

export enum AllowanceKey {
  AllowanceReset = 'allowanceReset',
  AllowanceApproval = 'allowanceApproval',
}

export type StreamingSwapFailedSwap = {
  reason: string
  swapIndex: number
}

export type StreamingSwapMetadata = {
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
}

export type ApprovalExecutionMetadata = {
  state: TransactionExecutionState
  txHash?: string
  isInitiallyRequired: boolean | undefined
  isRequired?: boolean
}

export type SwapExecutionMetadata = {
  state: TransactionExecutionState
  sellTxHash?: string
  buyTxHash?: string
  streamingSwap?: StreamingSwapMetadata
  message?: string | [string, InterpolationOptions]
}

export type HopProgress = {
  // i.e as an int from 0 to 100
  progress: number
  status: 'pending' | 'complete' | 'failed'
}

export type HopExecutionMetadata = {
  state: HopExecutionState
  allowanceReset: ApprovalExecutionMetadata
  allowanceApproval: ApprovalExecutionMetadata
  permit2: Omit<ApprovalExecutionMetadata, 'txHash' | 'isInitiallyRequired'> & {
    permit2Signature?: string
  }
  swap: SwapExecutionMetadata
  progress: HopProgress
}

export type TradeExecutionMetadata = {
  state: TradeExecutionState
  firstHop: HopExecutionMetadata
  secondHop: HopExecutionMetadata
}

import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import type { InterpolationOptions } from 'node-polyglot'
import type { ShapeshiftFeeMetadata } from 'lib/fees/model'

import type { ActiveQuoteMeta } from '../tradeQuoteSlice/types'

export type TradeExecutionSliceState = {
  activeStep: number | undefined // Make sure to actively check for undefined vs. falsy here. 0 is the first step, undefined means no active step yet
  // The quote being executed and its associated metadata
  confirmedQuote:
    | {
        quote: TradeQuote | TradeRate
        // Used to display the "You saved" message in the TradeSuccess component. This needs to be stored
        // here because trading fox will affect the calculation after the trade has been executed.
        shapeshiftFeeMetadata: ShapeshiftFeeMetadata
        metadata: ActiveQuoteMeta
      }
    | undefined
  tradeExecution: Record<TradeQuote['id'], TradeExecutionMetadata>
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
  isInitiallyRequired: boolean
  isRequired?: boolean
}

export type SwapExecutionMetadata = {
  state: TransactionExecutionState
  sellTxHash?: string
  buyTxHash?: string
  streamingSwap?: StreamingSwapMetadata
  message?: string | [string, InterpolationOptions]
}

export type HopExecutionMetadata = {
  state: HopExecutionState
  allowanceReset: ApprovalExecutionMetadata
  allowanceApproval: ApprovalExecutionMetadata
  permit2: Omit<ApprovalExecutionMetadata, 'txHash' | 'isInitiallyRequired'> & {
    permit2Signature?: string
  }
  swap: SwapExecutionMetadata
}

export type TradeExecutionMetadata = {
  state: TradeExecutionState
  firstHop: HopExecutionMetadata
  secondHop: HopExecutionMetadata
}

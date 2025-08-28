import type {
  SwapExecutionMetadata,
  SwapperName,
  TradeQuote,
  TradeRate,
  TransactionExecutionState,
} from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'

import type { ApiQuote } from '@/state/apis/swapper/types'

export type ActiveQuoteMeta = { swapperName: SwapperName; identifier: string }

export type TradeQuoteSliceState = {
  activeStep: number | undefined // Make sure to actively check for undefined vs. falsy here. 0 is the first step, undefined means no active step yet
  activeQuoteMeta: ActiveQuoteMeta | undefined // the selected quote metadata used to find the active quote in the api responses
  confirmedQuote: TradeQuote | TradeRate | undefined // the quote being executed
  tradeExecution: Record<TradeQuote['id'], TradeExecutionMetadata>
  tradeQuotes: PartialRecord<SwapperName, Record<string, ApiQuote>> // mapping from swapperName to quoteId to ApiQuote
  tradeQuoteDisplayCache: ApiQuote[]
  isTradeQuoteRequestAborted: boolean // used to conditionally render results and loading state
  sortOption: QuoteSortOption // the selected quote sorting option
}

export enum HopExecutionState {
  Pending = 'Pending',
  AwaitingAllowanceReset = 'AwaitingAllowanceReset',
  AwaitingAllowanceApproval = 'AwaitingAllowanceApproval',
  AwaitingPermit2Eip712Sign = 'AwaitingPermit2Eip712Sign',
  AwaitingSwap = 'AwaitingSwap',
  Complete = 'Complete',
}

export enum QuoteSortOption {
  BEST_RATE = 'BEST_RATE', // Default sorting - best receive amount after all fees
  LOWEST_GAS = 'LOWEST_GAS',
  FASTEST = 'FASTEST',
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

export type ApprovalExecutionMetadata = {
  state: TransactionExecutionState
  txHash?: string
  isInitiallyRequired: boolean | undefined
  isRequired?: boolean
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
  utxoChangeAddress?: string // UTXO change address for display
}

export type TradeExecutionMetadata = {
  state: TradeExecutionState
  firstHop: HopExecutionMetadata
  secondHop: HopExecutionMetadata
}

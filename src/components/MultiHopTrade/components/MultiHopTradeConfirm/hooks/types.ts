export type ThornodeStreamingSwapResponseSuccess = {
  tx_id?: string
  interval?: number
  quantity?: number
  count?: number
  last_height?: number
  trade_target?: string
  deposit?: string
  in?: string
  out?: string
  failed_swaps?: number[]
  failed_swap_reasons?: string[]
}

export type ThornodeStreamingSwapResponseError = { error: string }

export type ThornodeStreamingSwapResponse =
  | ThornodeStreamingSwapResponseSuccess
  | ThornodeStreamingSwapResponseError

export type ChainflipStreamingSwapResponseSuccess = {
  executedChunks: number,
  remainingChunks: number
}

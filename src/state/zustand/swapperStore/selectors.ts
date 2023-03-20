import { DEFAULT_SLIPPAGE } from 'constants/constants'
import type { SwapperState } from 'state/zustand/swapperStore/useSwapperStore'

export const selectSlippage = (state: SwapperState) =>
  state.activeSwapperWithMetadata?.quote.recommendedSlippage ?? DEFAULT_SLIPPAGE

export const selectQuote = (state: SwapperState) => state.activeSwapperWithMetadata?.quote

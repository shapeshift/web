import type { ChainId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import type { SwapperState } from 'state/zustand/swapperStore/useSwapperStore'

export const selectSlippage = (state: SwapperState): string =>
  state.activeSwapperWithMetadata?.quote.recommendedSlippage ?? DEFAULT_SLIPPAGE

export const selectQuote = (state: SwapperState): TradeQuote<ChainId> | undefined =>
  state.activeSwapperWithMetadata?.quote

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade = (state: SwapperState): boolean => {
  const activeSwapper = state.activeSwapperWithMetadata?.swapper
  switch (activeSwapper?.name) {
    case SwapperName.Thorchain:
    case SwapperName.Osmosis:
      return true
    case SwapperName.Zrx:
    case SwapperName.CowSwap:
      return false
    default:
      return false
  }
}

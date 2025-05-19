import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'

import { useChainflipStreamingProgress } from './useChainflipStreamingProgress'
import { useThorStreamingProgress } from './useThorStreamingProgress'

import {
  selectActiveQuote,
  selectActiveSwapperName,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from '@/state/store'

type UseStreamingProgressProps = {
  hopIndex: number
  tradeQuoteStep: TradeQuoteStep
}

export const useStreamingProgress = ({ hopIndex, tradeQuoteStep }: UseStreamingProgressProps) => {
  const activeQuote = useAppSelector(selectActiveQuote)
  const currentSwapperName = useAppSelector(selectActiveSwapperName)
  const isStreamingSwap = activeQuote?.isStreaming || false

  const streamingProgressArgs = {
    tradeQuoteStep,
    hopIndex,
    confirmedTradeId: activeQuote?.id ?? '',
  }

  const thorchainStreamingProgress = useThorStreamingProgress({
    ...streamingProgressArgs,
    swapperName: SwapperName.Thorchain,
  })

  const mayachainStreamingProgress = useThorStreamingProgress({
    ...streamingProgressArgs,
    swapperName: SwapperName.Mayachain,
  })

  const chainflipStreamingProgress = useChainflipStreamingProgress(streamingProgressArgs)

  if (!isStreamingSwap) return

  switch (currentSwapperName) {
    case SwapperName.Thorchain:
      return thorchainStreamingProgress
    case SwapperName.Mayachain:
      return mayachainStreamingProgress
    case SwapperName.Chainflip:
      return chainflipStreamingProgress
    default:
      throw new Error(`Invalid swapper: ${currentSwapperName}`)
  }
}

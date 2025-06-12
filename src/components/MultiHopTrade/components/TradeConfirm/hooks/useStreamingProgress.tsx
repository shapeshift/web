import type { Swap } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'

import { useChainflipStreamingProgress } from './useChainflipStreamingProgress'
import { useThorStreamingProgress } from './useThorStreamingProgress'

type UseStreamingProgressProps = {
  swap: Swap | undefined
}

export const useStreamingProgress = ({ swap }: UseStreamingProgressProps) => {
  const isStreamingSwap = swap?.isStreaming || false
  const confirmedSwapId = swap?.id

  const streamingProgressArgs = {
    swap,
    confirmedSwapId,
  }

  const currentSwapperName = useMemo(() => {
    if (swap) {
      return swap.swapperName
    }
  }, [swap])

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

import type { Swap } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'

import { useChainflipStreamingProgress } from './useChainflipStreamingProgress'
import { useThorStreamingProgress } from './useThorStreamingProgress'

type UseStreamingProgressProps = {
  swap: Swap | undefined
}

export const useStreamingProgress = ({ swap }: UseStreamingProgressProps) => {
  const isStreamingSwap = swap?.isStreaming || false
  const isThorchainSwap = swap?.swapperName === SwapperName.Thorchain
  const confirmedSwapId = swap?.id

  const streamingProgressArgs = {
    swap,
    confirmedSwapId,
  }

  const thorchainStreamingProgress = useThorStreamingProgress(streamingProgressArgs)
  const chainflipStreamingProgress = useChainflipStreamingProgress(streamingProgressArgs)
  const streamingProgress = isThorchainSwap
    ? thorchainStreamingProgress
    : chainflipStreamingProgress

  return isStreamingSwap ? streamingProgress : undefined
}

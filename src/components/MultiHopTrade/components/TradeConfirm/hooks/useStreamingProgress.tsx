import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import {
  selectActiveSwapperName,
  selectConfirmedQuote,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { useChainflipStreamingProgress } from '../../MultiHopTradeConfirm/hooks/useChainflipStreamingProgress'
import { useThorStreamingProgress } from '../../MultiHopTradeConfirm/hooks/useThorStreamingProgress'

type UseStreamingProgressProps = {
  hopIndex: number
  tradeQuoteStep: TradeQuoteStep
}

export const useStreamingProgress = ({ hopIndex, tradeQuoteStep }: UseStreamingProgressProps) => {
  const confirmedQuote = useAppSelector(selectConfirmedQuote)
  const currentSwapperName = useAppSelector(selectActiveSwapperName)
  const isStreamingSwap = confirmedQuote?.isStreaming || false
  const isThorchainSwap = currentSwapperName === SwapperName.Thorchain
  const confirmedTradeId = confirmedQuote?.id

  const streamingProgressArgs = {
    tradeQuoteStep,
    hopIndex,
    confirmedTradeId: confirmedTradeId ?? '',
  }

  const thorchainStreamingProgress = useThorStreamingProgress(streamingProgressArgs)
  const chainflipStreamingProgress = useChainflipStreamingProgress(streamingProgressArgs)
  const streamingProgress = isThorchainSwap
    ? thorchainStreamingProgress
    : chainflipStreamingProgress

  return isStreamingSwap ? streamingProgress : undefined
}

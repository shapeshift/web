import type { TradeQuote, TradeQuoteStep, TradeRate } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { selectActiveSwapperName } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { useChainflipStreamingProgress } from '../../MultiHopTradeConfirm/hooks/useChainflipStreamingProgress'
import { useThorStreamingProgress } from '../../MultiHopTradeConfirm/hooks/useThorStreamingProgress'

type UseStreamingProgressProps = {
  hopIndex: number
  activeTradeQuote: TradeQuote | TradeRate
  tradeQuoteStep: TradeQuoteStep
}

export const useStreamingProgress = ({
  hopIndex,
  activeTradeQuote,
  tradeQuoteStep,
}: UseStreamingProgressProps) => {
  const currentSwapperName = useAppSelector(selectActiveSwapperName)
  const isStreamingSwap = activeTradeQuote.isStreaming
  const isThorchainSwap = currentSwapperName === SwapperName.Thorchain
  const confirmedTradeId = activeTradeQuote.id

  const streamingProgressArgs = {
    tradeQuoteStep,
    hopIndex,
    confirmedTradeId,
  }

  const thorchainStreamingProgress = useThorStreamingProgress(streamingProgressArgs)
  const chainflipStreamingProgress = useChainflipStreamingProgress(streamingProgressArgs)
  const streamingProgress = isThorchainSwap
    ? thorchainStreamingProgress
    : chainflipStreamingProgress

  return isStreamingSwap ? streamingProgress : undefined
}

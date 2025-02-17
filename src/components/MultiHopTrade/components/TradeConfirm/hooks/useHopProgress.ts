import type { SupportedTradeQuoteStepIndex, TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { ChainflipStatusMessage } from '@shapeshiftoss/swapper/dist/swappers/ChainflipSwapper/constants'
import { LifiStatusMessage } from '@shapeshiftoss/swapper/dist/swappers/LifiSwapper/constants'
import { ThorchainStatusMessage } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import { useEffect, useMemo } from 'react'
import {
  selectActiveQuote,
  selectHopExecutionMetadata,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import type { SwapExecutionMetadata } from 'state/slices/tradeQuoteSlice/types'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

type SwapperProgressMap = Record<string, number>
type SwapperProgressMaps = Partial<Record<SwapperName, SwapperProgressMap>>

const SWAPPER_PROGRESS_MAPS: SwapperProgressMaps = {
  [SwapperName.Chainflip]: {
    // Polling will take a few renders for fetch to succeed and its status message reflected, so nilish effectively means 'Waiting for deposit'
    '': 1,
    [ChainflipStatusMessage.WaitingForDeposit]: 1,
    [ChainflipStatusMessage.DepositDetected]: 20,
    [ChainflipStatusMessage.ProcessingSwap]: 40,
    [ChainflipStatusMessage.OutboundTransactionInitiated]: 60,
    [ChainflipStatusMessage.PreparingOutboundTransaction]: 60,
    [ChainflipStatusMessage.TransactionSent]: 80,
    [ChainflipStatusMessage.SwapComplete]: 100,
    [ChainflipStatusMessage.SwapFailed]: 100,
  },
  [SwapperName.Thorchain]: {
    // Polling will take a few renders for fetch to succeed and its status message reflected, so nilish effectively means 'Inbound observed'
    '': 7,
    [ThorchainStatusMessage.InboundObservingPending]: 15,
    [ThorchainStatusMessage.InboundObserved]: 22,
    [ThorchainStatusMessage.InboundConfirmationPending]: 29,
    [ThorchainStatusMessage.InboundConfirmationCounted]: 36,
    [ThorchainStatusMessage.InboundFinalizationPending]: 43,
    [ThorchainStatusMessage.InboundFinalized]: 50,
    [ThorchainStatusMessage.SwapPending]: 57,
    [ThorchainStatusMessage.SwapCompleteAwaitingOutbound]: 64,
    [ThorchainStatusMessage.SwapCompleteAwaitingDestination]: 71,
    // We can't map this guy as it's actually dynamic
    // [ThorchainStatusMessage.OutboundDelayTimeRemaining]: 85,
    [ThorchainStatusMessage.OutboundDelayPending]: 85,
    [ThorchainStatusMessage.OutboundScheduled]: 92,
    [ThorchainStatusMessage.OutboundSigned]: 100,
  },
  [SwapperName.LIFI]: {
    '': 16,
    [LifiStatusMessage.BridgeWaitingForConfirmations]: 33,
    [LifiStatusMessage.BridgeOffChainExecution]: 66,
    [LifiStatusMessage.BridgeComplete]: 100,
  },
}

const getSwapperSpecificProgress = ({
  message,
  hopIndex,
  activeQuote,
}: {
  message: SwapExecutionMetadata['message']
  hopIndex: number | undefined
  activeQuote: TradeQuote | TradeRate | undefined
}): number | undefined => {
  if (!activeQuote) return

  const swapperName = activeQuote.swapperName

  const progressMap = SWAPPER_PROGRESS_MAPS[swapperName]
  if (!progressMap) return

  const isCrossChainSwap =
    activeQuote.steps[0].sellAsset.chainId !== activeQuote.steps[0].buyAsset.chainId
  const isFirstHop = hopIndex === 0

  // For Li.Fi, only apply bridge progress for cross-chain bridges (either single or multi) and always on the first hop only.
  if (swapperName === SwapperName.LIFI && (!isCrossChainSwap || !isFirstHop)) return

  // This can technically be string | [string, InterpolationOptions] according to types but it won't
  const _message = message as string | undefined

  return progressMap[_message ?? '']
}

export const useHopProgress = (
  hopIndex: SupportedTradeQuoteStepIndex | undefined,
  tradeId: string | undefined,
) => {
  const dispatch = useAppDispatch()

  const hopExecutionMetadataFilter = useMemo(() => {
    if (!tradeId || hopIndex === undefined) return

    return { tradeId, hopIndex }
  }, [hopIndex, tradeId])

  const hopExecutionMetadata = useAppSelector(state =>
    hopExecutionMetadataFilter
      ? selectHopExecutionMetadata(state, hopExecutionMetadataFilter)
      : undefined,
  )

  const activeQuote = useAppSelector(selectActiveQuote)
  const swapperName = activeQuote?.swapperName

  useEffect(() => {
    if (!hopExecutionMetadata?.swap.sellTxHash || hopIndex === undefined || !tradeId) return

    const swapperSpecificProgress = getSwapperSpecificProgress({
      message: hopExecutionMetadata.swap.message,
      hopIndex,
      activeQuote,
    })

    // Prioritize swapper-specific progress if we're able to infer it from the hop status
    if (swapperSpecificProgress !== undefined) {
      dispatch(
        tradeQuoteSlice.actions.setHopProgress({
          hopIndex,
          tradeId,
          progress: swapperSpecificProgress,
          status: swapperSpecificProgress === 100 ? 'complete' : 'pending',
        }),
      )
      return
    }

    if (hopExecutionMetadata.swap.sellTxHash) {
      dispatch(
        tradeQuoteSlice.actions.setHopProgress({
          hopIndex,
          tradeId,
          progress: 50,
          status: 'pending',
        }),
      )
    }
  }, [
    dispatch,
    hopIndex,
    tradeId,
    hopExecutionMetadata?.swap,
    hopExecutionMetadata?.swap.message,
    swapperName,
    activeQuote,
  ])

  useEffect(() => {
    if (!hopExecutionMetadata?.swap.sellTxHash || hopIndex === undefined || !tradeId) return

    if (hopExecutionMetadata.swap.state === TransactionExecutionState.Failed) {
      dispatch(
        tradeQuoteSlice.actions.setHopProgress({
          hopIndex,
          tradeId,
          progress: 100,
          status: 'failed',
        }),
      )
    }

    if (hopExecutionMetadata.swap.state === TransactionExecutionState.Complete) {
      dispatch(
        tradeQuoteSlice.actions.setHopProgress({
          hopIndex,
          tradeId,
          progress: 100,
          status: 'complete',
        }),
      )
    }
  }, [
    dispatch,
    hopIndex,
    tradeId,
    hopExecutionMetadata?.swap.sellTxHash,
    hopExecutionMetadata?.swap.state,
  ])

  const progress = useMemo(() => hopExecutionMetadata?.progress, [hopExecutionMetadata])

  return progress
}

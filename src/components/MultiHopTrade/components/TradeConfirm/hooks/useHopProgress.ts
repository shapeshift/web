import type { SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import { getHopByIndex, SwapperName } from '@shapeshiftoss/swapper'
import { ChainflipStatusMessage } from '@shapeshiftoss/swapper/dist/swappers/ChainflipSwapper/constants'
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
    // Polling will take a few renders for fetch to succeed and its status message reflected, so nilish effectively means 'Waiting for deposit...'
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
    // Polling will take a few renders for fetch to succeed and its status message reflected, so nilish effectively means 'Waiting for deposit...'
    '': 7,
    [ThorchainStatusMessage.InboundObserved]: 15,
    [ThorchainStatusMessage.InboundObservingPending]: 15,
    [ThorchainStatusMessage.InboundConfirmationPending]: 29,
    [ThorchainStatusMessage.InboundConfirmationCounted]: 29,
    [ThorchainStatusMessage.InboundFinalizationPending]: 43,
    [ThorchainStatusMessage.InboundFinalized]: 43,
    [ThorchainStatusMessage.SwapPending]: 57,
    [ThorchainStatusMessage.SwapCompleteAwaitingOutbound]: 71,
    [ThorchainStatusMessage.SwapCompleteAwaitingDestination]: 71,
    // We can't map this guy as it's actually dynamic
    // [ThorchainStatusMessage.OutboundDelayTimeRemaining]: 85,
    [ThorchainStatusMessage.OutboundDelayPending]: 85,
    [ThorchainStatusMessage.OutboundScheduled]: 92,
    [ThorchainStatusMessage.OutboundSigned]: 100,
  },
}

const getSwapperSpecificProgress = (
  swapperName: SwapperName | undefined,
  message: SwapExecutionMetadata['message'],
): number | undefined => {
  if (!swapperName) return

  const progressMap = SWAPPER_PROGRESS_MAPS[swapperName]
  if (!progressMap) return

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
  const activeStep = hopIndex !== undefined ? getHopByIndex(activeQuote, hopIndex) : undefined
  const swapperName = activeStep?.source as SwapperName | undefined

  useEffect(() => {
    if (!hopExecutionMetadata?.swap.sellTxHash || hopIndex === undefined || !tradeId) return

    const swapperSpecificProgress = getSwapperSpecificProgress(
      swapperName,
      hopExecutionMetadata.swap.message,
    )

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

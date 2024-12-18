import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { ChainFlipStatus } from '@shapeshiftoss/swapper/dist/swappers/ChainflipSwapper/types'
import axios from 'axios'
import { getConfig } from 'config'
import { useEffect, useMemo } from 'react'
import { usePoll } from 'hooks/usePoll/usePoll'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import type {
  StreamingSwapFailedSwap,
  StreamingSwapMetadata,
} from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import type { ChainflipStreamingSwapResponseSuccess } from './types'

const POLL_INTERVAL_MILLISECONDS = 5_000 // 5 seconds

const DEFAULT_STREAMING_SWAP_METADATA: StreamingSwapMetadata = {
  attemptedSwapCount: 0,
  totalSwapCount: 0,
  failedSwaps: [],
}

const getChainflipStreamingSwap = async (
  swapId: number | undefined,
): Promise<ChainflipStreamingSwapResponseSuccess | undefined> => {
  if (!swapId) return

  const config = getConfig()
  const brokerUrl = config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = config.REACT_APP_CHAINFLIP_API_KEY

  const statusResponse = await axios
    .get<ChainFlipStatus>(`${brokerUrl}/status-by-id?apiKey=${apiKey}&swapId=${swapId}`)
    .then(response => {
      return response.data
    })
    .catch(function (error) {
      console.log('getChainflipStreamingSwap.getStatusById', error)
      return null
    })

  if (!statusResponse) return

  const swapState = statusResponse.status?.state
  const dcaStatus = statusResponse.status?.swap?.dca

  if (!dcaStatus) return

  if (
    swapState === 'sending' ||
    swapState === 'sent' ||
    swapState === 'completed' ||
    swapState === 'failed'
  ) {
    // It's finished!
    return {
      executedChunks: dcaStatus!.executedChunks!,
      remainingChunks: 0,
    }
  }

  return {
    executedChunks: dcaStatus!.executedChunks!,
    remainingChunks: dcaStatus!.remainingChunks!,
  }
}

const getStreamingSwapMetadata = (
  data: ChainflipStreamingSwapResponseSuccess,
): StreamingSwapMetadata => {
  // When a swap fails on Chainflip, the streaming stops, there are never failed ones
  const failedSwaps: StreamingSwapFailedSwap[] = []

  return {
    totalSwapCount: data.executedChunks + data.remainingChunks,
    attemptedSwapCount: data.executedChunks ?? 0,
    failedSwaps,
  }
}

export const useChainflipStreamingProgress = ({
  tradeQuoteStep,
  hopIndex,
  confirmedTradeId,
}: {
  tradeQuoteStep: TradeQuoteStep
  hopIndex: number
  confirmedTradeId: TradeQuote['id']
}): {
  isComplete: boolean
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
} => {
  const { poll, cancelPolling } = usePoll<ChainflipStreamingSwapResponseSuccess | undefined>()
  const dispatch = useAppDispatch()
  const hopExecutionMetadataFilter = useMemo(() => {
    return {
      tradeId: confirmedTradeId,
      hopIndex,
    }
  }, [confirmedTradeId, hopIndex])

  const {
    swap: { sellTxHash, streamingSwap: streamingSwapMeta },
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopExecutionMetadataFilter))

  const swapId = tradeQuoteStep.chainflipSpecific?.chainflipSwapId

  useEffect(() => {
    // don't start polling until we have a tx
    if (!sellTxHash) return

    poll({
      fn: async () => {
        const updatedStreamingSwapData = await getChainflipStreamingSwap(swapId)

        // no payload at all - must be a failed request - return
        if (!updatedStreamingSwapData) return

        // data to update - update
        dispatch(
          tradeQuoteSlice.actions.setStreamingSwapMeta({
            hopIndex,
            streamingSwapMetadata: getStreamingSwapMetadata(updatedStreamingSwapData),
            id: confirmedTradeId,
          }),
        )
        return updatedStreamingSwapData
      },
      validate: streamingSwapData => {
        if (!streamingSwapData) return false
        return streamingSwapData.remainingChunks === 0
      },
      interval: POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })

    // stop polling on dismount
    return cancelPolling
  }, [
    cancelPolling,
    dispatch,
    hopIndex,
    poll,
    sellTxHash,
    confirmedTradeId,
    swapId,
    tradeQuoteStep,
  ])

  const result = useMemo(() => {
    const numSuccessfulSwaps =
      (streamingSwapMeta?.attemptedSwapCount ?? 0) - (streamingSwapMeta?.failedSwaps?.length ?? 0)

    const isComplete =
      streamingSwapMeta !== undefined && numSuccessfulSwaps >= streamingSwapMeta.totalSwapCount

    return {
      isComplete,
      ...(streamingSwapMeta ?? DEFAULT_STREAMING_SWAP_METADATA),
    }
  }, [streamingSwapMeta])

  return result
}

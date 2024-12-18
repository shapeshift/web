import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'
import { useEffect, useMemo, useRef } from 'react'
import { usePoll } from 'hooks/usePoll/usePoll'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import type {
  StreamingSwapFailedSwap,
  StreamingSwapMetadata,
} from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import type { ThornodeStreamingSwapResponse, ThornodeStreamingSwapResponseSuccess } from './types'
const POLL_INTERVAL_MILLISECONDS = 30_000 // 30 seconds

const DEFAULT_STREAMING_SWAP_METADATA: StreamingSwapMetadata = {
  attemptedSwapCount: 0,
  totalSwapCount: 0,
  failedSwaps: [],
}

const getThorchainStreamingSwap = async (
  sellTxHash: string,
): Promise<ThornodeStreamingSwapResponseSuccess | undefined> => {
  const thorTxHash = sellTxHash.replace(/^0x/, '')
  const { data: streamingSwapData } = await axios.get<ThornodeStreamingSwapResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/swap/streaming/${thorTxHash}`,
  )

  if (!streamingSwapData) return
  if ('error' in streamingSwapData) {
    console.error('failed to fetch streaming swap data', streamingSwapData.error)
    return
  }

  return streamingSwapData
}

const getStreamingSwapMetadata = (
  data: ThornodeStreamingSwapResponseSuccess,
): StreamingSwapMetadata => {
  const failedSwaps: StreamingSwapFailedSwap[] =
    data.failed_swaps?.map(
      (swapIndex, i): StreamingSwapFailedSwap => ({
        swapIndex,
        reason: data.failed_swap_reasons?.[i] ?? '',
      }),
    ) ?? []

  return {
    totalSwapCount: data.quantity ?? 0,
    attemptedSwapCount: data.count ?? 0,
    failedSwaps,
  }
}

export const useThorStreamingProgress = ({
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
  // a ref is used to allow updating and reading state without creating a dependency cycle
  const streamingSwapDataRef = useRef<ThornodeStreamingSwapResponseSuccess>()
  const { poll, cancelPolling } = usePoll<ThornodeStreamingSwapResponseSuccess | undefined>()
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

  useEffect(() => {
    // don't start polling until we have a tx
    if (!sellTxHash) return

    poll({
      fn: async () => {
        const updatedStreamingSwapData = await getThorchainStreamingSwap(sellTxHash)

        // no payload at all - must be a failed request - return
        if (!updatedStreamingSwapData) return

        // We don't have a quantity in the streaming swap data, and we never have.
        if (!streamingSwapDataRef.current?.quantity && !updatedStreamingSwapData.quantity) {
          // This is a special case where it _is_ a streaming swap, but it's one of the following cases:
          // - optimized over a single block, and so doesn't actually stream.
          // - the streaming swap metadata isn't ready yet
          //
          // In both cases its simpler to exit and not render the progress bar.
          return
        }

        // thornode returns a default empty response once the streaming is complete
        // set the count to the quantity so UI can display completed status
        if (streamingSwapDataRef.current?.quantity && !updatedStreamingSwapData.quantity) {
          const completedStreamingSwapData: ThornodeStreamingSwapResponseSuccess = {
            ...streamingSwapDataRef.current,
            count: streamingSwapDataRef.current.quantity,
          }
          streamingSwapDataRef.current = completedStreamingSwapData

          dispatch(
            tradeQuoteSlice.actions.setStreamingSwapMeta({
              hopIndex,
              streamingSwapMetadata: getStreamingSwapMetadata(completedStreamingSwapData),
              id: confirmedTradeId,
            }),
          )

          return completedStreamingSwapData
        }

        // data to update - update
        streamingSwapDataRef.current = updatedStreamingSwapData
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
        if (!streamingSwapData || !streamingSwapData.quantity) return false
        return streamingSwapData.count === streamingSwapData.quantity
      },
      interval: POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })

    // stop polling on dismount
    return cancelPolling
  }, [cancelPolling, dispatch, hopIndex, poll, sellTxHash, confirmedTradeId])

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

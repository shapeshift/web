import axios from 'axios'
import { getConfig } from 'config'
import { useCallback, useEffect, useMemo, useRef } from 'react'
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

export const useThorStreamingProgress = (
  hopIndex: number,
  // Allow the caller to opt out of polling for streaming swaps
  isStreaming: boolean = true,
): {
  isComplete: boolean
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
  waitForStreamingSwapCompletion: () => Promise<void>
} => {
  // a ref is used to allow updating and reading state without creating a dependency cycle
  const streamingSwapDataRef = useRef<ThornodeStreamingSwapResponseSuccess>()
  const { poll, cancelPolling } = usePoll<ThornodeStreamingSwapResponseSuccess | undefined>()
  const dispatch = useAppDispatch()
  const {
    swap: { sellTxHash, streamingSwap: streamingSwapMeta },
  } = useAppSelector(state => selectHopExecutionMetadata(state, hopIndex))

  useEffect(() => {
    // Don't need to poll for non-streaming swaps
    if (!isStreaming) return

    // don't start polling until we have a tx
    if (!sellTxHash) return

    poll({
      fn: async () => {
        const updatedStreamingSwapData = await getThorchainStreamingSwap(sellTxHash)

        // no payload at all - must be a failed request - return
        if (!updatedStreamingSwapData) return

        // no valid data received so far and no valid data to update - return
        if (!streamingSwapDataRef.current?.quantity && !updatedStreamingSwapData.quantity) return

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
  }, [cancelPolling, dispatch, hopIndex, isStreaming, poll, sellTxHash])

  const isComplete = useMemo(() => {
    if (!isStreaming) return true
    return (
      streamingSwapMeta !== undefined &&
      streamingSwapMeta.attemptedSwapCount === streamingSwapMeta.totalSwapCount
    )
  }, [isStreaming, streamingSwapMeta])

  const isCompleteRef = useRef(isComplete)
  isCompleteRef.current = isComplete

  const waitForStreamingSwapCompletion = useCallback(() => {
    return new Promise<void>(resolve => {
      if (isCompleteRef.current) {
        resolve()
      } else {
        const checkCompletion = () => {
          if (isCompleteRef.current) {
            resolve()
          } else {
            setTimeout(checkCompletion, 1000) // Check every second
          }
        }
        checkCompletion()
      }
    })
  }, [])

  const result = useMemo(() => {
    return {
      isComplete,
      waitForStreamingSwapCompletion,
      ...(streamingSwapMeta ?? DEFAULT_STREAMING_SWAP_METADATA),
    }
  }, [isComplete, streamingSwapMeta, waitForStreamingSwapCompletion])

  return result
}

import { useEffect } from 'react'
import { sleep } from 'lib/poll/poll'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import {
  type StreamingSwapFailedSwap,
  type StreamingSwapMetadata,
} from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

// toggle this to force the mock hooks to always fail - useful for testing failure modes
const MOCK_FAIL_STREAMING_SWAP = true

const DEFAULT_STREAMING_SWAP_METADATA: StreamingSwapMetadata = {
  attemptedSwapCount: 0,
  totalSwapCount: 0,
  failedSwaps: [],
}

// TODO: remove me
export const useMockThorStreamingProgress = (
  hopIndex: number,
): {
  isComplete: boolean
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
} => {
  const dispatch = useAppDispatch()
  const {
    swap: { sellTxHash, streamingSwap: streamingSwapMeta },
  } = useAppSelector(selectHopExecutionMetadata)[hopIndex]

  const streamingSwapExecutionStarted = streamingSwapMeta !== undefined

  useEffect(() => {
    if (!sellTxHash || streamingSwapExecutionStarted) return
    ;(async () => {
      dispatch(
        tradeQuoteSlice.actions.setStreamingSwapMeta({
          hopIndex,
          streamingSwapMetadata: {
            totalSwapCount: 3,
            attemptedSwapCount: 0,
            failedSwaps: [],
          },
        }),
      )

      await sleep(1500)

      dispatch(
        tradeQuoteSlice.actions.setStreamingSwapMeta({
          hopIndex,
          streamingSwapMetadata: {
            totalSwapCount: 3,
            attemptedSwapCount: 1,
            failedSwaps: [],
          },
        }),
      )

      await sleep(1500)

      dispatch(
        tradeQuoteSlice.actions.setStreamingSwapMeta({
          hopIndex,
          streamingSwapMetadata: {
            totalSwapCount: 3,
            attemptedSwapCount: 2,
            failedSwaps: MOCK_FAIL_STREAMING_SWAP
              ? [
                  {
                    reason: 'mock reason',
                    swapIndex: 1,
                  },
                ]
              : [],
          },
        }),
      )

      await sleep(1500)

      dispatch(
        tradeQuoteSlice.actions.setStreamingSwapMeta({
          hopIndex,
          streamingSwapMetadata: {
            totalSwapCount: 3,
            attemptedSwapCount: 3,
            failedSwaps: MOCK_FAIL_STREAMING_SWAP
              ? [
                  {
                    reason: 'mock reason',
                    swapIndex: 1,
                  },
                ]
              : [],
          },
        }),
      )
    })()
  }, [dispatch, hopIndex, sellTxHash, streamingSwapExecutionStarted])

  const isComplete =
    streamingSwapMeta !== undefined &&
    streamingSwapMeta.attemptedSwapCount === streamingSwapMeta.totalSwapCount

  return {
    ...(streamingSwapMeta ?? DEFAULT_STREAMING_SWAP_METADATA),
    isComplete,
  }
}

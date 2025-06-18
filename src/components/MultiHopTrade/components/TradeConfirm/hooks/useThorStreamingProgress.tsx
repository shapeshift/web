import type {
  StreamingSwapFailedSwap,
  StreamingSwapMetadata,
  Swap,
  SwapperName,
} from '@shapeshiftoss/swapper'
import { getDaemonUrl, SwapStatus } from '@shapeshiftoss/swapper'
import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo, useRef } from 'react'

import type { ThornodeStreamingSwapResponse, ThornodeStreamingSwapResponseSuccess } from '../types'

import { getConfig } from '@/config'
import { selectSwapById } from '@/state/slices/swapSlice/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const POLL_INTERVAL_MILLISECONDS = 30_000 // 30 seconds

const DEFAULT_STREAMING_SWAP_METADATA: StreamingSwapMetadata = {
  attemptedSwapCount: 0,
  maxSwapCount: 0,
  failedSwaps: [],
}

const getThorchainStreamingSwap = async (
  sellTxHash: string,
  swapperName: SwapperName,
): Promise<ThornodeStreamingSwapResponseSuccess | undefined> => {
  const daemonUrl = getDaemonUrl(getConfig(), swapperName)
  const thorTxHash = sellTxHash.replace(/^0x/, '')

  const { data: streamingSwapData } = await axios.get<ThornodeStreamingSwapResponse>(
    `${daemonUrl}/swap/streaming/${thorTxHash}`,
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
  swap: Swap,
): StreamingSwapMetadata => {
  const failedSwaps: StreamingSwapFailedSwap[] =
    data.failed_swaps?.map(
      (swapIndex, i): StreamingSwapFailedSwap => ({
        swapIndex,
        reason: data.failed_swap_reasons?.[i] ?? '',
      }),
    ) ?? []

  return {
    maxSwapCount: data.quantity ?? swap.metadata?.streamingSwapMetadata?.maxSwapCount ?? 0,
    attemptedSwapCount: data.count ?? 0,
    failedSwaps,
  }
}

export const useThorStreamingProgress = ({
  confirmedSwapId,
  swapperName,
}: {
  confirmedSwapId: string | undefined
  swapperName: SwapperName
}): {
  attemptedSwapCount: number
  maxSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
} => {
  // a ref is used to allow updating and reading state without creating a dependency cycle
  const streamingSwapDataRef = useRef<ThornodeStreamingSwapResponseSuccess>(undefined)
  const dispatch = useAppDispatch()
  const swapByIdFilter = useMemo(() => ({ swapId: confirmedSwapId ?? '' }), [confirmedSwapId])
  const swap = useAppSelector(state => selectSwapById(state, swapByIdFilter))

  const { sellTxHash, metadata } = swap ?? {}
  const { streamingSwapMetadata } = metadata ?? {}

  useQuery({
    queryKey: ['streamingSwapData', confirmedSwapId, swapperName],
    queryFn:
      swap &&
      swap.swapperName === swapperName &&
      sellTxHash &&
      swap.isStreaming &&
      swap.status === SwapStatus.Pending &&
      confirmedSwapId
        ? async () => {
            const updatedStreamingSwapData = await getThorchainStreamingSwap(
              sellTxHash,
              swapperName,
            )

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
                swapSlice.actions.upsertSwap({
                  ...swap,
                  metadata: {
                    ...swap.metadata,
                    streamingSwapMetadata: {
                      ...(swap.metadata?.streamingSwapMetadata ?? {}),
                      ...getStreamingSwapMetadata(completedStreamingSwapData, swap),
                    },
                  },
                }),
              )

              return completedStreamingSwapData
            }

            streamingSwapDataRef.current = updatedStreamingSwapData
            dispatch(
              swapSlice.actions.upsertSwap({
                ...swap,
                metadata: {
                  ...swap.metadata,
                  streamingSwapMetadata: {
                    ...(swap.metadata?.streamingSwapMetadata ?? {}),
                    ...getStreamingSwapMetadata(updatedStreamingSwapData, swap),
                  },
                },
              }),
            )
            return updatedStreamingSwapData
          }
        : skipToken,
    refetchInterval: POLL_INTERVAL_MILLISECONDS,
  })

  const result = useMemo(() => {
    return {
      ...(streamingSwapMetadata ?? DEFAULT_STREAMING_SWAP_METADATA),
    }
  }, [streamingSwapMetadata])

  return result
}

import type {
  ChainFlipStatus,
  StreamingSwapFailedSwap,
  StreamingSwapMetadata,
} from '@shapeshiftoss/swapper'
import axios from 'axios'
import { useEffect, useMemo } from 'react'

import type { ChainflipStreamingSwapResponseSuccess } from '../types'

import { getConfig } from '@/config'
import { usePoll } from '@/hooks/usePoll/usePoll'
import { selectSwapById } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

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
  const brokerUrl = config.VITE_CHAINFLIP_API_URL
  const apiKey = config.VITE_CHAINFLIP_API_KEY

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
      executedChunks: dcaStatus.executedChunks ?? 0,
      remainingChunks: 0,
    }
  }

  return {
    executedChunks: dcaStatus?.executedChunks ?? 0,
    remainingChunks: dcaStatus?.remainingChunks ?? 0,
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
  confirmedSwapId,
}: {
  confirmedSwapId: string | undefined
}): {
  isComplete: boolean
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
  numSuccessfulSwaps: number
} => {
  const { poll, cancelPolling } = usePoll<ChainflipStreamingSwapResponseSuccess | undefined>()
  const dispatch = useAppDispatch()
  const swapIdFilter = useMemo(() => {
    return {
      swapId: confirmedSwapId ?? '',
    }
  }, [confirmedSwapId])

  const swap = useAppSelector(state => selectSwapById(state, swapIdFilter))

  const { sellTxHash, metadata } = swap ?? {}
  const { streamingSwapMetadata, chainflipSwapId } = metadata ?? {}

  useEffect(() => {
    // don't start polling until we have a tx
    if (!sellTxHash) return
    if (!swap) return

    poll({
      fn: async () => {
        const updatedStreamingSwapData = await getChainflipStreamingSwap(chainflipSwapId)

        // no payload at all - must be a failed request - return
        if (!updatedStreamingSwapData) return

        // data to update - update
        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
            metadata: {
              ...swap.metadata,
              streamingSwapMetadata: getStreamingSwapMetadata(updatedStreamingSwapData),
            },
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
  }, [cancelPolling, dispatch, poll, chainflipSwapId, sellTxHash, swap])

  const result = useMemo(() => {
    const numSuccessfulSwaps =
      (streamingSwapMetadata?.attemptedSwapCount ?? 0) -
      (streamingSwapMetadata?.failedSwaps?.length ?? 0)

    const isComplete =
      streamingSwapMetadata !== undefined &&
      numSuccessfulSwaps >= streamingSwapMetadata.totalSwapCount

    return {
      isComplete,
      ...(streamingSwapMetadata ?? DEFAULT_STREAMING_SWAP_METADATA),
      numSuccessfulSwaps,
    }
  }, [streamingSwapMetadata])

  return result
}

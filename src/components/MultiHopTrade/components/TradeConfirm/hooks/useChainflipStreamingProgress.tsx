import type {
  ChainFlipStatus,
  StreamingSwapFailedSwap,
  StreamingSwapMetadata,
} from '@shapeshiftoss/swapper'
import { SwapperName, SwapStatus } from '@shapeshiftoss/swapper'
import { skipToken, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'

import type { ChainflipStreamingSwapResponseSuccess } from '../types'

import { getConfig } from '@/config'
import { selectSwapById } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const POLL_INTERVAL_MILLISECONDS = 5_000 // 5 seconds

const DEFAULT_STREAMING_SWAP_METADATA: StreamingSwapMetadata = {
  attemptedSwapCount: 0,
  maxSwapCount: 0,
  failedSwaps: [],
}

const getChainflipStreamingSwap = async (
  swapId: number | undefined,
): Promise<ChainflipStreamingSwapResponseSuccess | undefined> => {
  if (swapId === undefined) return

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
    maxSwapCount: data.executedChunks + data.remainingChunks,
    attemptedSwapCount: data.executedChunks ?? 0,
    failedSwaps,
  }
}

export const useChainflipStreamingProgress = ({
  confirmedSwapId,
}: {
  confirmedSwapId: string | undefined
}): {
  attemptedSwapCount: number
  maxSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
} => {
  const dispatch = useAppDispatch()
  const swapIdFilter = useMemo(() => {
    return {
      swapId: confirmedSwapId ?? '',
    }
  }, [confirmedSwapId])

  const swap = useAppSelector(state => selectSwapById(state, swapIdFilter))

  const { sellTxHash, metadata } = swap ?? {}
  const { streamingSwapMetadata, chainflipSwapId } = metadata ?? {}

  useQuery({
    queryKey: ['streamingSwapData', chainflipSwapId, SwapperName.Chainflip],
    queryFn:
      chainflipSwapId !== undefined &&
      swap &&
      swap.swapperName === SwapperName.Chainflip &&
      sellTxHash &&
      swap.status === SwapStatus.Pending
        ? async () => {
            const updatedStreamingSwapData = await getChainflipStreamingSwap(chainflipSwapId)

            // no payload at all - must be a failed request - return
            if (!updatedStreamingSwapData) return

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
